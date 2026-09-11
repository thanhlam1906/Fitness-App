package com.fitness.assistant.tools;

import com.fitness.common.CurrentUser;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.program.LoadDecision;
import com.fitness.program.LoadDecisionRepository;
import com.fitness.program.Program;
import com.fitness.program.ProgramRepository;
import com.fitness.program.ScheduledExercise;
import com.fitness.program.ScheduledExerciseRepository;
import com.fitness.program.ScheduledWorkout;
import com.fitness.program.ScheduledWorkoutRepository;
import com.fitness.workout.SetLogRepository;
import com.fitness.workout.WorkoutSession;
import com.fitness.workout.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Nhóm B — concept-chatbot-v1.md §9: LLM GỌI hàm, không TÍNH. Mọi số trả về
 * đọc thẳng từ DB, không do LLM tự suy ra.
 *
 * Bất biến §9.1: KHÔNG tool nào nhận userId làm tham số. userId luôn lấy từ
 * CurrentUser (SecurityContext), không bao giờ từ input LLM — LLM nhận input
 * từ người dùng, nhận userId làm tham số là đường thẳng tới đọc dữ liệu
 * người khác.
 */
@Component
public class AssistantTools {

	private final CurrentUser currentUser;
	private final ProgramRepository programs;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ExerciseRepository exercises;
	private final LoadDecisionRepository loadDecisions;
	private final WorkoutSessionRepository workoutSessions;
	private final SetLogRepository setLogs;

	public AssistantTools(
			CurrentUser currentUser, ProgramRepository programs, ScheduledWorkoutRepository scheduledWorkouts,
			ScheduledExerciseRepository scheduledExercises, ExerciseRepository exercises,
			LoadDecisionRepository loadDecisions, WorkoutSessionRepository workoutSessions,
			SetLogRepository setLogs) {
		this.currentUser = currentUser;
		this.programs = programs;
		this.scheduledWorkouts = scheduledWorkouts;
		this.scheduledExercises = scheduledExercises;
		this.exercises = exercises;
		this.loadDecisions = loadDecisions;
		this.workoutSessions = workoutSessions;
		this.setLogs = setLogs;
	}

	// ── B2: "Tuần này tôi tập gì?" ──────────────────────────────────────────

	public record WorkoutDay(LocalDate date, String label, String status, List<ExerciseTarget> exercises) {
	}

	public record ExerciseTarget(String exerciseName, int sets, int repsMin, int repsMax, BigDecimal loadKg) {
	}

	public record ThisWeekSchedule(boolean hasActiveProgram, List<WorkoutDay> days) {
	}

	@Tool(description = "Lấy lịch tập TUẦN NÀY (thứ 2 đến chủ nhật hiện tại) của người dùng đang hỏi. "
			+ "Không cần tham số nào — không bao giờ hỏi hay đoán userId.")
	public ThisWeekSchedule getThisWeekSchedule() {
		Optional<Program> program = programs.findByUserIdAndStatus(currentUser.id(), "ACTIVE");
		if (program.isEmpty()) {
			return new ThisWeekSchedule(false, List.of());
		}
		LocalDate today = LocalDate.now();
		LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
		LocalDate sunday = monday.plusDays(6);

		List<ScheduledWorkout> workouts = scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.get().getId())
				.stream()
				.filter(w -> !w.getScheduledOn().isBefore(monday) && !w.getScheduledOn().isAfter(sunday))
				.toList();
		Map<UUID, Exercise> exerciseById = exercises.findAll().stream()
				.collect(java.util.stream.Collectors.toMap(Exercise::getId, e -> e));

		List<WorkoutDay> days = workouts.stream()
				.map(w -> new WorkoutDay(w.getScheduledOn(), w.getLabel(), w.getStatus(),
						scheduledExercises.findByScheduledWorkoutId(w.getId()).stream()
								.map(se -> toTarget(se, exerciseById))
								.toList()))
				.toList();
		return new ThisWeekSchedule(true, days);
	}

	private ExerciseTarget toTarget(ScheduledExercise se, Map<UUID, Exercise> exerciseById) {
		Exercise exercise = exerciseById.get(se.getExerciseId());
		String name = exercise == null ? "?" : exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn();
		return new ExerciseTarget(name, se.getTargetSets(), se.getTargetReps(), se.getTargetRepsMax(),
				se.getTargetLoadKg());
	}

	// ── B1: "Tại sao tuần này giảm tải?" ────────────────────────────────────

	public record LoadChangeExplanation(
			boolean exerciseFound, boolean decisionFound, String exerciseName, String direction,
			BigDecimal deltaKg, String explanation) {
	}

	@Tool(description = "Giải thích vì sao tải (mức tạ) của MỘT bài tập cụ thể vừa tăng, giảm, hay giữ nguyên "
			+ "ở lần gần nhất. Trả về đúng lời giải thích đã lưu trong hệ thống, không tự bịa lý do khác.")
	public LoadChangeExplanation explainLoadChange(
			@ToolParam(description = "slug của bài tập, ví dụ 'barbell-back-squat'") String exerciseSlug) {
		Optional<Exercise> exercise = exercises.findBySlug(exerciseSlug);
		if (exercise.isEmpty()) {
			return new LoadChangeExplanation(false, false, null, null, null,
					"Không tìm thấy bài tập với slug '" + exerciseSlug + "'.");
		}
		Optional<LoadDecision> decision = loadDecisions
				.findFirstByUserIdAndExerciseIdOrderByEffectiveFromDesc(currentUser.id(), exercise.get().getId());
		if (decision.isEmpty()) {
			return new LoadChangeExplanation(true, false, exercise.get().getNameVi(), null, null,
					"Chưa có quyết định thay đổi tải nào được ghi nhận cho bài này.");
		}
		LoadDecision d = decision.get();
		return new LoadChangeExplanation(true, true, exercise.get().getNameVi(), d.getDirection(), d.getDeltaKg(),
				d.getMessageVi());
	}

	// ── B3: "Tiến bộ thế nào?" ───────────────────────────────────────────────

	public record ProgressSummary(
			int weeks, long sessionsStarted, long sessionsFinished, BigDecimal totalTonnageKg, Double avgSessionRpe) {
	}

	@Tool(description = "Tóm tắt tiến bộ tập luyện N tuần gần nhất: số buổi đã bắt đầu/hoàn thành, tổng khối "
			+ "lượng đã nâng (tonnage, kg), RPE trung bình mỗi buổi.")
	public ProgressSummary getProgressSummary(
			@ToolParam(description = "số tuần muốn xem lại, ví dụ 4") int weeks) {
		int clampedWeeks = Math.max(1, Math.min(weeks, 52));
		UUID userId = currentUser.id();
		Instant since = Instant.now().minus(java.time.Duration.ofDays(clampedWeeks * 7L));

		List<WorkoutSession> sessions = workoutSessions.findByUserIdAndStartedAtAfter(userId, since);
		long finished = sessions.stream().filter(s -> "DONE".equals(s.getStatus())).count();
		java.util.OptionalDouble avgRpe = sessions.stream()
				.map(WorkoutSession::getSessionRpe)
				.filter(java.util.Objects::nonNull)
				.mapToInt(Short::intValue)
				.average();
		BigDecimal tonnage = setLogs.totalTonnageSince(userId, since);

		return new ProgressSummary(
				clampedWeeks, sessions.size(), finished, tonnage, avgRpe.isPresent() ? avgRpe.getAsDouble() : null);
	}
}
