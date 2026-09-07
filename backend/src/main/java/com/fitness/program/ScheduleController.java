package com.fitness.program;

import com.fitness.common.CurrentUser;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Màn 4 concept-frontend-v1.md — "Lịch tuần", màn chính, nguồn sự thật. */
@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

	private final ProgramRepository programs;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ExerciseRepository exercises;
	private final LoadDecisionRepository loadDecisions;
	private final CurrentUser currentUser;

	public ScheduleController(
			ProgramRepository programs, ScheduledWorkoutRepository scheduledWorkouts,
			ScheduledExerciseRepository scheduledExercises, ExerciseRepository exercises,
			LoadDecisionRepository loadDecisions, CurrentUser currentUser) {
		this.programs = programs;
		this.scheduledWorkouts = scheduledWorkouts;
		this.scheduledExercises = scheduledExercises;
		this.exercises = exercises;
		this.loadDecisions = loadDecisions;
		this.currentUser = currentUser;
	}

	@GetMapping
	public ScheduleResponse get() {
		Program program = programs.findByUserIdAndStatus(currentUser.id(), "ACTIVE")
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có chương trình đang chạy"));

		List<ScheduledWorkout> workouts = scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.getId());

		List<ScheduledExercise> allExercises = workouts.stream()
				.flatMap(w -> scheduledExercises.findByScheduledWorkoutId(w.getId()).stream())
				.toList();
		Map<UUID, Exercise> exerciseById = exercises.findAllById(
				allExercises.stream().map(ScheduledExercise::getExerciseId).distinct().toList())
				.stream().collect(Collectors.toMap(Exercise::getId, e -> e));

		// theo exerciseId, mới nhất trước — §5.4 lý do rule hiển thị ngay tại chỗ trên màn lịch
		Map<UUID, List<LoadDecision>> decisionsByExercise = loadDecisions.findByProgramId(program.getId()).stream()
				.collect(Collectors.groupingBy(LoadDecision::getExerciseId));
		decisionsByExercise.values().forEach(list ->
				list.sort(Comparator.comparing(LoadDecision::getEffectiveFrom).reversed()));

		List<ScheduledWorkoutView> views = workouts.stream()
				.map(w -> new ScheduledWorkoutView(
						w.getId(), w.getScheduledOn(), w.getWeekIndex(), w.getLabel(), w.getStatus(),
						scheduledExercises.findByScheduledWorkoutId(w.getId()).stream()
								.sorted((a, b) -> Integer.compare(a.getOrderIndex(), b.getOrderIndex()))
								.map(se -> toView(se, exerciseById.get(se.getExerciseId()),
										latestReasonAsOf(decisionsByExercise, se.getExerciseId(), w.getScheduledOn())))
								.toList()))
				.toList();

		return new ScheduleResponse(program.getId(), views);
	}

	/** Lý do của lần đổi tải gần nhất KHÔNG SAU ngày buổi này — buổi cũ hơn giữ nguyên lý do đã áp dụng lúc đó. */
	private String latestReasonAsOf(Map<UUID, List<LoadDecision>> decisionsByExercise, UUID exerciseId, LocalDate scheduledOn) {
		return decisionsByExercise.getOrDefault(exerciseId, List.of()).stream()
				.filter(d -> !d.getEffectiveFrom().isAfter(scheduledOn))
				.findFirst()
				.map(LoadDecision::getMessageVi)
				.orElse(null);
	}

	private ScheduledExerciseView toView(ScheduledExercise se, Exercise exercise, String loadChangeReason) {
		return new ScheduledExerciseView(
				se.getId(), exercise.getSlug(), exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn(),
				se.getOrderIndex(), se.getTargetSets(), se.getTargetReps(), se.getTargetLoadKg(),
				se.getRestSeconds() == null ? null : (int) se.getRestSeconds(), loadChangeReason);
	}
}
