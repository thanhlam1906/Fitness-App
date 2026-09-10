package com.fitness.workout;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.program.LoadDecision;
import com.fitness.program.LoadDecisionRepository;
import com.fitness.program.Program;
import com.fitness.program.ProgramRepository;
import com.fitness.program.ScheduledExercise;
import com.fitness.program.ScheduledExerciseRepository;
import com.fitness.program.ScheduledWorkout;
import com.fitness.program.ScheduledWorkoutRepository;
import com.fitness.program.progression.Direction;
import com.fitness.program.progression.ExerciseProgressionState;
import com.fitness.program.progression.ExerciseProgressionStateRepository;
import com.fitness.program.progression.LoadDecisionResult;
import com.fitness.program.progression.ProgressionEngine;
import com.fitness.program.progression.ProgressionSignal;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nối buổi tập vừa kết thúc với ProgressionEngine. Đánh giá theo TỪNG BUỔI
 * (không gộp cả tuần) — content-seed-v1.md §8, hai bài kiểm tra bộ seed: log
 * MỘT buổi đủ rep là engine đã ra quyết định, không đợi hết tuần.
 *
 * "Đủ rep" dùng target_reps_max (trần khoảng rep) làm mốc cho MỌI trường hợp
 * — kể cả LINEAR, nơi target_reps == target_reps_max nên mốc tự nhiên trùng
 * sàn. Điều này khớp GeneratedExercise: trần mới là "tín hiệu tăng tải thật
 * sự". consecutiveFailStreak lại dùng SÀN (target_reps) làm mốc thất bại
 * thật — nếu dùng trần thì double progression bình thường (đang leo dần từ
 * sàn lên trần qua nhiều buổi) sẽ bị tính nhầm là "trượt" liên tục và bị
 * deload oan. Set thiếu (không log) hoặc bị bỏ cũng tính là thất bại thật.
 */
@Service
public class ProgressionApplicationService {

	private final SetLogRepository setLogs;
	private final PainReportRepository painReports;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ProgramRepository programs;
	private final ProgramTemplateRepository templates;
	private final ExerciseRepository exercises;
	private final ExerciseProgressionStateRepository progressionStates;
	private final LoadDecisionRepository loadDecisions;
	private final ObjectMapper objectMapper;
	private final ProgressionEngine engine = new ProgressionEngine();

	public ProgressionApplicationService(
			SetLogRepository setLogs, PainReportRepository painReports,
			ScheduledExerciseRepository scheduledExercises, ScheduledWorkoutRepository scheduledWorkouts,
			ProgramRepository programs, ProgramTemplateRepository templates, ExerciseRepository exercises,
			ExerciseProgressionStateRepository progressionStates, LoadDecisionRepository loadDecisions,
			ObjectMapper objectMapper) {
		this.setLogs = setLogs;
		this.painReports = painReports;
		this.scheduledExercises = scheduledExercises;
		this.scheduledWorkouts = scheduledWorkouts;
		this.programs = programs;
		this.templates = templates;
		this.exercises = exercises;
		this.progressionStates = progressionStates;
		this.loadDecisions = loadDecisions;
		this.objectMapper = objectMapper;
	}

	@Transactional
	public void applyForFinishedSession(WorkoutSession session) {
		if (session.getScheduledWorkoutId() == null) {
			return; // tập ngoài lịch — không có template để biết increment/target_rpe, bỏ qua
		}
		ScheduledWorkout workout = scheduledWorkouts.findById(session.getScheduledWorkoutId()).orElseThrow();
		Program program = programs.findById(workout.getProgramId()).orElseThrow();
		ProgramTemplate template = templates.findById(program.getTemplateId()).orElseThrow();

		JsonNode progressionConfig = readJson(template.getProgression());
		double targetRpe = progressionConfig.path("target_rpe").asDouble(8);
		double deloadPct = progressionConfig.path("deload_pct").asDouble(10);
		JsonNode incrementMap = progressionConfig.path("increment_kg");

		boolean painThisSession = !painReports.findBySessionId(session.getId()).isEmpty();
		List<SetLog> sessionLogs = setLogs.findBySessionId(session.getId());
		Map<UUID, List<SetLog>> byExercise = sessionLogs.stream().collect(Collectors.groupingBy(SetLog::getExerciseId));
		List<ScheduledExercise> workoutExercises = scheduledExercises.findByScheduledWorkoutId(workout.getId());

		for (ScheduledExercise scheduledExercise : workoutExercises) {
			if (scheduledExercise.getTargetLoadKg() == null) {
				continue; // bodyweight (vd push-up) — tăng tiến bằng rep, chưa xử lý ở đợt này
			}
			UUID exerciseId = scheduledExercise.getExerciseId();
			List<SetLog> logsForExercise = byExercise.getOrDefault(exerciseId, List.of());
			Exercise exercise = exercises.findById(exerciseId).orElseThrow();
			BigDecimal incrementKg = readIncrement(incrementMap, exercise.getSlug());
			if (incrementKg == null) {
				continue; // template thiếu increment_kg cho bài này — admin nhập chưa đủ, bỏ qua an toàn
			}

			ExerciseProgressionState state = progressionStates
					.findByUserIdAndProgramIdAndExerciseId(session.getUserId(), program.getId(), exerciseId)
					.orElseGet(() -> new ExerciseProgressionState(session.getUserId(), program.getId(), exerciseId));

			ProgressionSignal signal = buildSignal(
					scheduledExercise, logsForExercise, painThisSession, targetRpe, deloadPct,
					incrementKg.doubleValue(), state);
			LoadDecisionResult result = engine.decide(signal);

			persistDecision(session, program, exerciseId, workout.getScheduledOn(), result);
			applyToFutureSchedule(program.getId(), exerciseId, workout.getScheduledOn(), scheduledExercise, result);
			updateState(state, signal, painThisSession);
		}
	}

	private ProgressionSignal buildSignal(
			ScheduledExercise scheduledExercise, List<SetLog> logsForExercise, boolean painThisSession,
			double targetRpe, double deloadPct, double incrementKg, ExerciseProgressionState state) {
		int floor = scheduledExercise.getTargetReps();
		int ceiling = scheduledExercise.getTargetRepsMax();
		int setsTotal = scheduledExercise.getTargetSets();

		int setsMetTarget = (int) logsForExercise.stream()
				.filter(l -> !l.isSkipped() && l.getReps() != null && l.getReps() >= ceiling)
				.count();

		boolean anyTrueFail = logsForExercise.stream()
				.anyMatch(l -> l.isSkipped() || (l.getReps() != null && l.getReps() < floor));
		boolean incompleteLogging = logsForExercise.size() < setsTotal;
		boolean trueFailThisSession = anyTrueFail || incompleteLogging;
		int consecutiveFailStreak = trueFailThisSession ? state.getConsecutiveFailStreak() + 1 : 0;

		Short lastSetRpe = logsForExercise.stream()
				.max(Comparator.comparingInt(SetLog::getSetIndex))
				.map(SetLog::getRpe).orElse(null);
		Integer rpeBelowTargetStreak = lastSetRpe == null
				? null
				: (lastSetRpe < targetRpe ? state.getRpeBelowTargetStreak() + 1 : 0);
		boolean rpeAboveTargetPlusOne = lastSetRpe != null && lastSetRpe > targetRpe + 1;

		double completionRate = setsTotal == 0 ? 1.0 : (double) countCompleted(logsForExercise, floor) / setsTotal;

		return new ProgressionSignal(
				painThisSession, painThisSession && state.isLastPainReported(), completionRate,
				rpeBelowTargetStreak, rpeAboveTargetPlusOne, setsMetTarget, setsTotal,
				consecutiveFailStreak, scheduledExercise.getTargetLoadKg().doubleValue(), incrementKg, deloadPct);
	}

	private int countCompleted(List<SetLog> logs, int floor) {
		return (int) logs.stream()
				.filter(l -> !l.isSkipped() && l.getReps() != null && l.getReps() >= floor)
				.count();
	}

	private void persistDecision(
			WorkoutSession session, Program program, UUID exerciseId, LocalDate sessionDate, LoadDecisionResult result) {
		String ruleParamsJson;
		try {
			ruleParamsJson = objectMapper.writeValueAsString(result.ruleParams());
		} catch (Exception e) {
			ruleParamsJson = "{}";
		}
		loadDecisions.save(new LoadDecision(
				session.getUserId(), program.getId(), exerciseId, sessionDate, result.direction().name(),
				result.deltaKg() == null ? null : BigDecimal.valueOf(result.deltaKg()),
				result.ruleId(), ruleParamsJson, result.messageVi()));
	}

	/** SUBSTITUTE (đau lặp lại) chỉ ghi quyết định — đổi bài cần catalog bài thay thế, chưa xây (kế hoạch §5.5). */
	private void applyToFutureSchedule(
			UUID programId, UUID exerciseId, LocalDate sessionDate, ScheduledExercise thisWeekExercise,
			LoadDecisionResult result) {
		if (result.direction() == Direction.HOLD || result.direction() == Direction.SUBSTITUTE) {
			return;
		}
		BigDecimal newLoad = thisWeekExercise.getTargetLoadKg().add(BigDecimal.valueOf(result.deltaKg()));
		List<ScheduledWorkout> futureWorkouts = scheduledWorkouts.findByProgramIdOrderByScheduledOn(programId).stream()
				.filter(w -> w.getScheduledOn().isAfter(sessionDate))
				.toList();
		for (ScheduledWorkout futureWorkout : futureWorkouts) {
			for (ScheduledExercise se : scheduledExercises.findByScheduledWorkoutId(futureWorkout.getId())) {
				if (se.getExerciseId().equals(exerciseId)) {
					se.updateTargetLoad(newLoad);
					scheduledExercises.save(se);
				}
			}
		}
	}

	private void updateState(ExerciseProgressionState state, ProgressionSignal signal, boolean painThisSession) {
		short newFailStreak = (short) signal.consecutiveFailStreak();
		short newRpeStreak = (short) (signal.rpeBelowTargetStreak() == null
				? state.getRpeBelowTargetStreak()
				: signal.rpeBelowTargetStreak());
		state.update(newFailStreak, newRpeStreak, painThisSession);
		progressionStates.save(state);
	}

	private BigDecimal readIncrement(JsonNode incrementMap, String slug) {
		JsonNode value = incrementMap.get(slug);
		return value == null || value.isNull() ? null : BigDecimal.valueOf(value.asDouble());
	}

	private JsonNode readJson(String json) {
		try {
			return objectMapper.readTree(json);
		} catch (Exception e) {
			throw new IllegalStateException("progression JSON hỏng", e);
		}
	}
}
