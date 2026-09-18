package com.fitness.program;

import com.fitness.common.CurrentUser;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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
		Program program = activeProgramOrThrow();
		List<ScheduledWorkout> workouts = scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.getId());

		Map<UUID, List<ScheduledExercise>> exercisesByWorkout = workouts.stream()
				.collect(Collectors.toMap(
						ScheduledWorkout::getId, w -> scheduledExercises.findByScheduledWorkoutId(w.getId())));

		Map<UUID, Exercise> exerciseById = exerciseCatalog(exercisesByWorkout);

		// theo exerciseId, mới nhất trước — §5.2 lý do rule hiển thị ngay tại chỗ trên màn lịch
		Map<UUID, List<LoadDecision>> decisionsByExercise = loadDecisions.findByProgramId(program.getId()).stream()
				.collect(Collectors.groupingBy(LoadDecision::getExerciseId));
		decisionsByExercise.values().forEach(list ->
				list.sort(Comparator.comparing(LoadDecision::getEffectiveFrom).reversed()));

		LocalDate today = LocalDate.now();
		List<ScheduledWorkoutView> views = workouts.stream()
				.map(w -> new ScheduledWorkoutView(
						w.getId(), w.getScheduledOn(), w.getWeekIndex(), w.getLabel(),
						displayStatus(w, today),
						exercisesByWorkout.get(w.getId()).stream()
								.sorted(Comparator.comparingInt(ScheduledExercise::getOrderIndex))
								.map(se -> toView(se, exerciseById,
										latestDecisionAsOf(decisionsByExercise, se.getExerciseId(), w.getScheduledOn())))
								.toList()))
				.toList();

		return new ScheduleResponse(
				program.getId(), program.getStartDate(), Arrays.asList(program.getRestDays()), views);
	}

	/**
	 * §5.5 — thay bài khi thiếu thiết bị. Chỉ đổi ĐÚNG buổi đang mở: người dùng
	 * thiếu thiết bị hôm nay không có nghĩa là thiếu cả 4 tuần tới.
	 */
	@PostMapping("/exercises/{scheduledExerciseId}/substitute")
	public ScheduledExerciseView substitute(
			@PathVariable UUID scheduledExerciseId, @RequestBody SubstituteRequest request) {
		Program program = activeProgramOrThrow();
		ScheduledExercise target = scheduledExercises.findById(scheduledExerciseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch"));

		ScheduledWorkout workout = scheduledWorkouts.findById(target.getScheduledWorkoutId()).orElseThrow();
		if (!workout.getProgramId().equals(program.getId())) {
			// Lớp 1 concept-backend-v1.md §5: không đụng được vào lịch của người khác.
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch");
		}
		if (!exercises.existsById(request.exerciseId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài thay thế không tồn tại");
		}

		target.substituteWith(request.exerciseId());
		scheduledExercises.save(target);
		return toView(target, exerciseCatalog(Map.of(workout.getId(), List.of(target))), null);
	}

	public record SubstituteRequest(@NotNull UUID exerciseId) {
	}

	/** Sửa set/rep/tạ của một bài trong ĐÚNG buổi đang mở — buổi khác giữ nguyên. */
	@PutMapping("/exercises/{scheduledExerciseId}")
	public ScheduledExerciseView updateExercise(
			@PathVariable UUID scheduledExerciseId, @Valid @RequestBody UpdateExerciseRequest request) {
		ScheduledExercise target = editableExerciseOrThrow(scheduledExerciseId);
		target.updateTargets(request.targetSets(), request.targetReps(), request.targetRepsMax(),
				request.targetLoadKg(), request.restSeconds());
		scheduledExercises.save(target);
		return toView(target, exerciseCatalog(
				Map.of(target.getScheduledWorkoutId(), List.of(target))), null);
	}

	@PostMapping("/workouts/{scheduledWorkoutId}/exercises")
	@ResponseStatus(HttpStatus.CREATED)
	public ScheduledExerciseView addExercise(
			@PathVariable UUID scheduledWorkoutId, @Valid @RequestBody AddExerciseRequest request) {
		ScheduledWorkout workout = scheduledWorkouts.findById(scheduledWorkoutId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi tập"));
		requireEditable(workout);
		if (!exercises.existsById(request.exerciseId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài tập không tồn tại");
		}

		// order_index unique theo buổi; max+1 vẫn đúng kể cả sau khi xoá bài ở giữa.
		short orderIndex = (short) (scheduledExercises.findByScheduledWorkoutId(scheduledWorkoutId).stream()
				.mapToInt(ScheduledExercise::getOrderIndex).max().orElse(0) + 1);
		ScheduledExercise added = scheduledExercises.save(new ScheduledExercise(
				scheduledWorkoutId, request.exerciseId(), orderIndex,
				request.targetSets().shortValue(), request.targetReps().shortValue(),
				request.targetRepsMax().shortValue(), request.targetLoadKg(),
				request.restSeconds() == null ? null : request.restSeconds().shortValue()));
		return toView(added, exerciseCatalog(Map.of(scheduledWorkoutId, List.of(added))), null);
	}

	@DeleteMapping("/exercises/{scheduledExerciseId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeExercise(@PathVariable UUID scheduledExerciseId) {
		scheduledExercises.delete(editableExerciseOrThrow(scheduledExerciseId));
	}

	public record UpdateExerciseRequest(
			@NotNull @Min(1) @Max(20) Integer targetSets,
			@NotNull @Min(1) @Max(100) Integer targetReps,
			@NotNull @Min(1) @Max(100) Integer targetRepsMax,
			BigDecimal targetLoadKg,
			Integer restSeconds) {
	}

	public record AddExerciseRequest(
			@NotNull UUID exerciseId,
			@NotNull @Min(1) @Max(20) Integer targetSets,
			@NotNull @Min(1) @Max(100) Integer targetReps,
			@NotNull @Min(1) @Max(100) Integer targetRepsMax,
			BigDecimal targetLoadKg,
			Integer restSeconds) {
	}

	private ScheduledExercise editableExerciseOrThrow(UUID scheduledExerciseId) {
		ScheduledExercise target = scheduledExercises.findById(scheduledExerciseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch"));
		requireEditable(scheduledWorkouts.findById(target.getScheduledWorkoutId()).orElseThrow());
		return target;
	}

	/**
	 * Buổi đã tập xong là bản ghi lịch sử — set_logs so với đúng set/rep đã lên
	 * kế hoạch lúc đó, sửa lại thì báo cáo tiến độ nói dối.
	 */
	private void requireEditable(ScheduledWorkout workout) {
		if (!workout.getProgramId().equals(activeProgramOrThrow().getId())) {
			// Lớp 1 concept-backend-v1.md §5: không đụng được vào lịch của người khác.
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch");
		}
		if (!"PLANNED".equals(workout.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Buổi này đã tập xong, không sửa được nữa");
		}
	}

	private Program activeProgramOrThrow() {
		return programs.findByUserIdAndStatus(currentUser.id(), "ACTIVE")
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có chương trình đang chạy"));
	}

	/** Bài gốc của một dòng đã thay cũng phải nạp — hiển thị "thay cho <bài cũ>". */
	private Map<UUID, Exercise> exerciseCatalog(Map<UUID, List<ScheduledExercise>> exercisesByWorkout) {
		List<UUID> ids = exercisesByWorkout.values().stream()
				.flatMap(List::stream)
				.flatMap(se -> se.getSubstitutedFrom() == null
						? java.util.stream.Stream.of(se.getExerciseId())
						: java.util.stream.Stream.of(se.getExerciseId(), se.getSubstitutedFrom()))
				.distinct()
				.toList();
		return exercises.findAllById(ids).stream().collect(Collectors.toMap(Exercise::getId, e -> e));
	}

	/** Buổi quá hạn mà chưa tập = bỏ lỡ. Suy ra khi đọc, không cần job quét đổi status. */
	private String displayStatus(ScheduledWorkout workout, LocalDate today) {
		boolean overdue = "PLANNED".equals(workout.getStatus()) && workout.getScheduledOn().isBefore(today);
		return overdue ? "MISSED" : workout.getStatus();
	}

	/** Quyết định gần nhất KHÔNG SAU ngày buổi này — buổi cũ hơn giữ nguyên lý do đã áp dụng lúc đó. */
	private LoadDecision latestDecisionAsOf(
			Map<UUID, List<LoadDecision>> decisionsByExercise, UUID exerciseId, LocalDate scheduledOn) {
		return decisionsByExercise.getOrDefault(exerciseId, List.of()).stream()
				.filter(d -> !d.getEffectiveFrom().isAfter(scheduledOn))
				.findFirst()
				.orElse(null);
	}

	private ScheduledExerciseView toView(
			ScheduledExercise se, Map<UUID, Exercise> exerciseById, LoadDecision decision) {
		Exercise exercise = exerciseById.get(se.getExerciseId());
		Exercise original = se.getSubstitutedFrom() == null ? null : exerciseById.get(se.getSubstitutedFrom());
		return new ScheduledExerciseView(
				se.getId(), se.getExerciseId(), exercise.getSlug(), displayName(exercise), exercise.isAnalyzable(),
				se.getOrderIndex(), se.getTargetSets(), se.getTargetReps(), se.getTargetRepsMax(),
				se.getTargetLoadKg(), se.getRestSeconds() == null ? null : (int) se.getRestSeconds(),
				original == null ? null : displayName(original),
				decision == null ? null : ScheduledExerciseView.LoadDecisionView.from(decision));
	}

	private String displayName(Exercise exercise) {
		return exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn();
	}
}
