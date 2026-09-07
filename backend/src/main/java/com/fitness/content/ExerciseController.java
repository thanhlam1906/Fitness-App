package com.fitness.content;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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

/**
 * Màn 12 concept-frontend-v1.md — CRUD ~40 bài. "Xoá" là tắt active (soft
 * delete): exercises bị scheduled_exercises tham chiếu, DELETE cứng vỡ FK.
 */
@RestController
@RequestMapping("/api/v1/exercises")
public class ExerciseController {

	private final ExerciseRepository exercises;

	public ExerciseController(ExerciseRepository exercises) {
		this.exercises = exercises;
	}

	@GetMapping
	public List<ExerciseResponse> list() {
		return exercises.findAll().stream().map(ExerciseResponse::from).toList();
	}

	@GetMapping("/{id}")
	public ExerciseResponse get(@PathVariable UUID id) {
		return ExerciseResponse.from(findOrThrow(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ExerciseResponse create(@Valid @RequestBody ExerciseRequest request) {
		if (request.slug() == null || request.slug().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug bắt buộc khi tạo mới");
		}
		if (exercises.findBySlug(request.slug()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "slug đã tồn tại");
		}
		Exercise exercise = new Exercise(
				request.slug(), request.nameEn(), request.nameVi(),
				toArray(request.muscleGroups()), toArray(request.equipment()),
				request.description(), request.analyzable());
		exercises.save(exercise);
		return ExerciseResponse.from(exercise);
	}

	@PutMapping("/{id}")
	public ExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody ExerciseRequest request) {
		Exercise exercise = findOrThrow(id);
		exercise.update(
				request.nameEn(), request.nameVi(), toArray(request.muscleGroups()),
				toArray(request.equipment()), request.description(), request.analyzable(),
				request.active());
		exercises.save(exercise);
		return ExerciseResponse.from(exercise);
	}

	@DeleteMapping("/{id}")
	public ExerciseResponse deactivate(@PathVariable UUID id) {
		Exercise exercise = findOrThrow(id);
		exercise.update(
				exercise.getNameEn(), exercise.getNameVi(), exercise.getMuscleGroups(),
				exercise.getEquipment(), exercise.getDescription(), exercise.isAnalyzable(), false);
		exercises.save(exercise);
		return ExerciseResponse.from(exercise);
	}

	private Exercise findOrThrow(UUID id) {
		return exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
