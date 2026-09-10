package com.fitness.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
	private final FormCheckRepository formChecks;
	private final ObjectMapper objectMapper;

	public ExerciseController(
			ExerciseRepository exercises, FormCheckRepository formChecks, ObjectMapper objectMapper) {
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.objectMapper = objectMapper;
	}

	@GetMapping
	public List<ExerciseResponse> list() {
		Map<UUID, Long> counts = new HashMap<>();
		for (Object[] row : formChecks.countActivePerExercise()) {
			counts.put((UUID) row[0], (Long) row[1]);
		}
		return exercises.findAll().stream()
				.map(e -> ExerciseResponse.from(e, counts.getOrDefault(e.getId(), 0L)))
				.toList();
	}

	@GetMapping("/{id}")
	public ExerciseResponse get(@PathVariable UUID id) {
		return withCount(findOrThrow(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse create(@Valid @RequestBody ExerciseRequest request) {
		if (request.slug() == null || request.slug().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug bắt buộc khi tạo mới");
		}
		if (exercises.findBySlug(request.slug()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "slug đã tồn tại");
		}
		JsonText.requireValidOrNull(objectMapper, "filmingGuide", request.filmingGuide());
		Exercise exercise = new Exercise(
				request.slug(), request.nameEn(), request.nameVi(),
				toArray(request.muscleGroups()), toArray(request.equipment()),
				request.description(), blankToNull(request.filmingGuide()), request.analyzable());
		exercises.save(exercise);
		return withCount(exercise);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody ExerciseRequest request) {
		JsonText.requireValidOrNull(objectMapper, "filmingGuide", request.filmingGuide());
		Exercise exercise = findOrThrow(id);
		exercise.update(
				request.nameEn(), request.nameVi(), toArray(request.muscleGroups()),
				toArray(request.equipment()), request.description(), blankToNull(request.filmingGuide()),
				request.analyzable(), request.active());
		exercises.save(exercise);
		return withCount(exercise);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse deactivate(@PathVariable UUID id) {
		Exercise exercise = findOrThrow(id);
		exercise.update(
				exercise.getNameEn(), exercise.getNameVi(), exercise.getMuscleGroups(),
				exercise.getEquipment(), exercise.getDescription(), exercise.getFilmingGuide(),
				exercise.isAnalyzable(), false);
		exercises.save(exercise);
		return withCount(exercise);
	}

	private ExerciseResponse withCount(Exercise exercise) {
		return ExerciseResponse.from(exercise, formChecks.countByExerciseIdAndActiveTrue(exercise.getId()));
	}

	private Exercise findOrThrow(UUID id) {
		return exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	/** Textarea rỗng gửi lên là "" — cột jsonb không nhận chuỗi rỗng, đổi thành NULL. */
	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
