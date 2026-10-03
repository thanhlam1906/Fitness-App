package com.fitness.program.service;

import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.program.dto.AddExerciseRequest;
import com.fitness.program.dto.ScheduleResponse;
import com.fitness.program.dto.ScheduledExerciseResponse;
import com.fitness.program.dto.ScheduledWorkoutResponse;
import com.fitness.program.dto.SubstituteRequest;
import com.fitness.program.dto.UpdateExerciseRequest;
import com.fitness.program.entity.LoadDecision;
import com.fitness.program.entity.Program;
import com.fitness.program.entity.ScheduledExercise;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Màn 4 concept-frontend-v1.md — "Lịch tuần", màn chính, nguồn sự thật. */
@Service
public class ScheduleService {

	private final ProgramRepository programs;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ExerciseRepository exercises;
	private final LoadDecisionRepository loadDecisions;
	private final WorkoutSessionRepository sessions;

	public ScheduleService(
			ProgramRepository programs, ScheduledWorkoutRepository scheduledWorkouts,
			ScheduledExerciseRepository scheduledExercises, ExerciseRepository exercises,
			LoadDecisionRepository loadDecisions, WorkoutSessionRepository sessions) {
		this.programs = programs;
		this.scheduledWorkouts = scheduledWorkouts;
		this.scheduledExercises = scheduledExercises;
		this.exercises = exercises;
		this.loadDecisions = loadDecisions;
		this.sessions = sessions;
	}

	public ScheduleResponse get(UUID userId) {
		Program program = activeProgramOrThrow(userId);
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
		Set<UUID> inProgress = sessions.findByUserIdAndStatus(userId, "IN_PROGRESS").stream()
				.map(WorkoutSession::getScheduledWorkoutId)
				.collect(Collectors.toSet());
		List<ScheduledWorkoutResponse> views = workouts.stream()
				.map(w -> new ScheduledWorkoutResponse(
						w.getId(), w.getScheduledOn(), w.getWeekIndex(), w.getLabel(),
						w.displayStatus(today), inProgress.contains(w.getId()),
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
	public ScheduledExerciseResponse substitute(UUID userId, UUID scheduledExerciseId, SubstituteRequest request) {
		Program program = activeProgramOrThrow(userId);
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

	/** Sửa set/rep/tạ của một bài trong ĐÚNG buổi đang mở — buổi khác giữ nguyên. */
	public ScheduledExerciseResponse updateExercise(
			UUID userId, UUID scheduledExerciseId, UpdateExerciseRequest request) {
		ScheduledExercise target = editableExerciseOrThrow(userId, scheduledExerciseId);
		target.updateTargets(request.targetSets(), request.targetReps(), request.targetRepsMax(),
				request.targetLoadKg(), request.restSeconds());
		scheduledExercises.save(target);
		return toView(target, exerciseCatalog(
				Map.of(target.getScheduledWorkoutId(), List.of(target))), null);
	}

	public ScheduledExerciseResponse addExercise(UUID userId, UUID scheduledWorkoutId, AddExerciseRequest request) {
		ScheduledWorkout workout = scheduledWorkouts.findById(scheduledWorkoutId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi tập"));
		requireEditable(userId, workout);
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

	public void removeExercise(UUID userId, UUID scheduledExerciseId) {
		scheduledExercises.delete(editableExerciseOrThrow(userId, scheduledExerciseId));
	}

	/**
	 * Kết thúc buổi tập thì buổi trong lịch thành DONE. Bảng lịch thuộc program nên workout gọi qua
	 * đây, không tự save (spec chuẩn cấu trúc §4.4). Chạy trong transaction kết thúc buổi của workout.
	 */
	public void markDone(UUID scheduledWorkoutId) {
		ScheduledWorkout workout = scheduledWorkouts.findById(scheduledWorkoutId).orElseThrow();
		workout.updateStatus("DONE");
		scheduledWorkouts.save(workout);
	}

	private ScheduledExercise editableExerciseOrThrow(UUID userId, UUID scheduledExerciseId) {
		ScheduledExercise target = scheduledExercises.findById(scheduledExerciseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch"));
		requireEditable(userId, scheduledWorkouts.findById(target.getScheduledWorkoutId()).orElseThrow());
		return target;
	}

	/**
	 * Buổi đã tập xong là bản ghi lịch sử — set_logs so với đúng set/rep đã lên
	 * kế hoạch lúc đó, sửa lại thì báo cáo tiến độ nói dối.
	 */
	private void requireEditable(UUID userId, ScheduledWorkout workout) {
		if (!workout.getProgramId().equals(activeProgramOrThrow(userId).getId())) {
			// Lớp 1 concept-backend-v1.md §5: không đụng được vào lịch của người khác.
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài trong lịch");
		}
		if (!"PLANNED".equals(workout.getStatus())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Buổi này đã tập xong, không sửa được nữa");
		}
	}

	private Program activeProgramOrThrow(UUID userId) {
		return programs.findByUserIdAndStatus(userId, "ACTIVE")
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

	/** Quyết định gần nhất KHÔNG SAU ngày buổi này — buổi cũ hơn giữ nguyên lý do đã áp dụng lúc đó. */
	private LoadDecision latestDecisionAsOf(
			Map<UUID, List<LoadDecision>> decisionsByExercise, UUID exerciseId, LocalDate scheduledOn) {
		return decisionsByExercise.getOrDefault(exerciseId, List.of()).stream()
				.filter(d -> !d.getEffectiveFrom().isAfter(scheduledOn))
				.findFirst()
				.orElse(null);
	}

	private ScheduledExerciseResponse toView(
			ScheduledExercise se, Map<UUID, Exercise> exerciseById, LoadDecision decision) {
		Exercise exercise = exerciseById.get(se.getExerciseId());
		Exercise original = se.getSubstitutedFrom() == null ? null : exerciseById.get(se.getSubstitutedFrom());
		return new ScheduledExerciseResponse(
				se.getId(), se.getExerciseId(), exercise.getSlug(), displayName(exercise), exercise.getDescription(),
				List.of(exercise.getMuscleGroups()), List.of(exercise.getStepsVi()), List.of(exercise.getMistakesVi()),
				exercise.isAnalyzable(),
				se.getOrderIndex(), se.getTargetSets(), se.getTargetReps(), se.getTargetRepsMax(),
				se.getTargetLoadKg(), se.getRestSeconds() == null ? null : (int) se.getRestSeconds(),
				original == null ? null : displayName(original),
				decision == null ? null : ScheduledExerciseResponse.LoadDecisionResponse.from(decision));
	}

	private String displayName(Exercise exercise) {
		return exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn();
	}
}
