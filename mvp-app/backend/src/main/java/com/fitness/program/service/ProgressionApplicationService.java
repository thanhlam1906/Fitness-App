package com.fitness.program.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.ProgramTemplate;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.entity.ExerciseProgressionState;
import com.fitness.program.entity.LoadDecision;
import com.fitness.program.entity.Program;
import com.fitness.program.entity.ScheduledExercise;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.ExerciseProgressionStateRepository;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.program.service.progression.Direction;
import com.fitness.program.service.progression.LoadDecisionResult;
import com.fitness.program.service.progression.ProgressionConfig;
import com.fitness.program.service.progression.ProgressionEngine;
import com.fitness.program.service.progression.ProgressionSignal;
import com.fitness.program.service.progression.ProgressionSignals;
import com.fitness.workout.entity.SetLog;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.PainReportRepository;
import com.fitness.workout.repository.SetLogRepository;
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
 * Phần gộp số liệu ở ProgressionSignals.build, dùng chung với Thử quy tắc của admin.
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
		if (program.getTemplateId() == null) {
			return; // lịch tự thiết kế: người dùng tự đặt set/rep/tạ, không có config progression để chỉnh
		}
		ProgramTemplate template = templates.findById(program.getTemplateId()).orElseThrow();

		ProgressionConfig config = ProgressionConfig.from(readJson(template.getProgression()));
		ProgressionEngine engine = new ProgressionEngine(config);

		boolean painThisSession = !painReports.findBySessionId(session.getId()).isEmpty();
		List<SetLog> sessionLogs = setLogs.findBySessionId(session.getId());
		Map<UUID, List<SetLog>> byExercise = sessionLogs.stream().collect(Collectors.groupingBy(SetLog::getExerciseId));
		List<ScheduledExercise> workoutExercises = scheduledExercises.findByScheduledWorkoutId(workout.getId());

		for (ScheduledExercise scheduledExercise : workoutExercises) {
			if (scheduledExercise.getTargetLoadKg() == null) {
				continue; // bodyweight (vd push-up) — tăng tiến bằng rep, chưa xử lý ở đợt này
			}
			UUID exerciseId = scheduledExercise.getExerciseId();
			Exercise exercise = exercises.findById(exerciseId).orElseThrow();
			BigDecimal incrementKg = config.incrementFor(exercise.getSlug());
			if (incrementKg == null) {
				continue; // admin chọn "Không tự tăng" hoặc template cũ thiếu bước tăng — bỏ qua an toàn
			}
			List<SetLog> logs = byExercise.getOrDefault(exerciseId, List.of()).stream()
					.sorted(Comparator.comparingInt(SetLog::getSetIndex)).toList();
			// Stream.toList nhận phần tử null: null = set bị bỏ hoặc không ghi rep.
			List<Integer> reps = logs.stream()
					.map(l -> l.isSkipped() || l.getReps() == null ? null : (Integer) l.getReps().intValue())
					.toList();
			Short lastRpe = logs.isEmpty() ? null : logs.get(logs.size() - 1).getRpe();

			ExerciseProgressionState state = progressionStates
					.findByUserIdAndProgramIdAndExerciseId(session.getUserId(), program.getId(), exerciseId)
					.orElseGet(() -> new ExerciseProgressionState(session.getUserId(), program.getId(), exerciseId));

			ProgressionSignal signal = ProgressionSignals.build(
					scheduledExercise.getTargetSets(), scheduledExercise.getTargetReps(),
					scheduledExercise.getTargetRepsMax(), reps, lastRpe == null ? null : lastRpe.doubleValue(),
					painThisSession, state.isLastPainReported(), state.getConsecutiveFailStreak(),
					state.getRpeBelowTargetStreak(), scheduledExercise.getTargetLoadKg().doubleValue(),
					incrementKg.doubleValue(), config);
			LoadDecisionResult result = engine.decide(signal);

			persistDecision(session, program, exerciseId, workout.getScheduledOn(), result);
			applyToFutureSchedule(program.getId(), exerciseId, workout.getScheduledOn(), scheduledExercise, result);
			updateState(state, signal, painThisSession);
		}
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

	private JsonNode readJson(String json) {
		try {
			return objectMapper.readTree(json);
		} catch (Exception e) {
			throw new IllegalStateException("progression JSON hỏng", e);
		}
	}
}
