package com.fitness.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.FormCheckRepository;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.ProfileRepository;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Danh mục bài tập. "Xoá" là tắt active (soft delete): exercises bị scheduled_exercises tham chiếu,
 * DELETE cứng vỡ FK.
 */
@Service
public class ExerciseService {

	private final ExerciseRepository exercises;
	private final FormCheckRepository formChecks;
	private final ProfileRepository profiles;
	private final ObjectMapper objectMapper;

	public ExerciseService(
			ExerciseRepository exercises, FormCheckRepository formChecks, ProfileRepository profiles,
			ObjectMapper objectMapper) {
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.profiles = profiles;
		this.objectMapper = objectMapper;
	}

	public List<ExerciseResponse> list() {
		Map<UUID, Long> counts = activeCheckCounts();
		return exercises.findAll().stream()
				.map(e -> ExerciseResponse.from(e, counts.getOrDefault(e.getId(), 0L)))
				.toList();
	}

	public ExerciseResponse get(UUID id) {
		return withCount(findOrThrow(id));
	}

	public ExerciseResponse create(ExerciseRequest request) {
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

	public ExerciseResponse update(UUID id, ExerciseRequest request) {
		JsonText.requireValidOrNull(objectMapper, "filmingGuide", request.filmingGuide());
		Exercise exercise = findOrThrow(id);
		exercise.update(
				request.nameEn(), request.nameVi(), toArray(request.muscleGroups()),
				toArray(request.equipment()), request.description(), blankToNull(request.filmingGuide()),
				request.analyzable(), request.active());
		exercises.save(exercise);
		return withCount(exercise);
	}

	public ExerciseResponse deactivate(UUID id) {
		Exercise exercise = findOrThrow(id);
		exercise.update(
				exercise.getNameEn(), exercise.getNameVi(), exercise.getMuscleGroups(),
				exercise.getEquipment(), exercise.getDescription(), exercise.getFilmingGuide(),
				exercise.isAnalyzable(), false);
		exercises.save(exercise);
		return withCount(exercise);
	}

	/**
	 * §5.5 ke-hoach-chi-tiet-chuc-nang-v1.md — thiếu thiết bị thì đề xuất bài thay thế cùng nhóm cơ,
	 * lọc theo thiết bị người dùng đang có. Lọc trong Java trên ~40 bài thay vì viết query GIN: bảng
	 * nhỏ, đọc dễ hơn.
	 *
	 * ponytail: quét toàn bảng exercises mỗi lần gọi. Trần là vài chục bài — nếu catalog lên hàng
	 * nghìn thì đổi sang query `muscle_groups && ARRAY[...]`.
	 */
	public List<ExerciseResponse> substitutes(UUID userId, UUID exerciseId) {
		Exercise original = findOrThrow(exerciseId);

		Set<String> userEquipment = profiles.findById(userId)
				.map(Profile::getEquipment).map(Set::of).orElse(Set.of());
		String[] targetMuscles = original.getMuscleGroups();
		if (targetMuscles.length == 0) {
			return List.of();
		}
		// Khớp theo nhóm cơ CHÍNH (phần tử đầu), không phải "trùng bất kỳ nhóm nào":
		// gần như bài nào cũng có CORE, nên "trùng bất kỳ" biến chống đẩy thành bài
		// thay cho squat. Sắp theo số nhóm cơ trùng, giống nhất lên đầu.
		String primaryMuscle = targetMuscles[0];
		Set<String> allMuscles = Set.of(targetMuscles);
		Map<UUID, Long> checkCounts = activeCheckCounts();

		return exercises.findAll().stream()
				.filter(Exercise::isActive)
				.filter(e -> !e.getId().equals(exerciseId))
				.filter(e -> List.of(e.getMuscleGroups()).contains(primaryMuscle))
				.filter(e -> userEquipment.containsAll(List.of(e.getEquipment())))
				.sorted(Comparator.comparingLong((Exercise e) -> overlap(e, allMuscles)).reversed())
				.map(e -> ExerciseResponse.from(e, checkCounts.getOrDefault(e.getId(), 0L)))
				.toList();
	}

	private Map<UUID, Long> activeCheckCounts() {
		Map<UUID, Long> counts = new HashMap<>();
		for (Object[] row : formChecks.countActivePerExercise()) {
			counts.put((UUID) row[0], (Long) row[1]);
		}
		return counts;
	}

	private ExerciseResponse withCount(Exercise exercise) {
		return ExerciseResponse.from(exercise, formChecks.countByExerciseIdAndActiveTrue(exercise.getId()));
	}

	private Exercise findOrThrow(UUID id) {
		return exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	private static long overlap(Exercise exercise, Set<String> muscles) {
		return Arrays.stream(exercise.getMuscleGroups()).filter(muscles::contains).count();
	}

	/** Textarea rỗng gửi lên là "" — cột jsonb không nhận chuỗi rỗng, đổi thành NULL. */
	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
