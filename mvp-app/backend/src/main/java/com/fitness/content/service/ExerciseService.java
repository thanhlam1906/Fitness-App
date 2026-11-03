package com.fitness.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.FormCheck;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.FormCheckRepository;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.ProfileRepository;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
	private final ExerciseImageService images;

	public ExerciseService(
			ExerciseRepository exercises, FormCheckRepository formChecks, ProfileRepository profiles,
			ObjectMapper objectMapper, ExerciseImageService images) {
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.profiles = profiles;
		this.objectMapper = objectMapper;
		this.images = images;
	}

	/** all = false: chỉ bài đang bật (màn người tập). all = true: cả bài tắt, chưa duyệt, đã xoá (màn admin). */
	public List<ExerciseResponse> list(boolean all) {
		Map<UUID, List<FormCheck>> checks = activeChecks();
		Map<String, Set<String>> imageKinds = images.kindsBySlug();
		return exercises.findAll().stream()
				.filter(e -> all || e.isActive())
				.map(e -> toResponse(e, checks.getOrDefault(e.getId(), List.of()), imageKinds))
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
		requireValidCodes(request);
		JsonText.requireValidOrNull(objectMapper, "filmingGuide", request.filmingGuide());
		Exercise exercise = new Exercise(
				request.slug(), request.nameEn(), request.nameVi(),
				toArray(request.muscleGroups()), toArray(request.equipment()),
				request.description(), blankToNull(request.filmingGuide()), false,
				cleanLines(request.stepsVi()), cleanLines(request.mistakesVi()));
		exercises.save(exercise);
		return withCount(exercise);
	}

	public ExerciseResponse update(UUID id, ExerciseRequest request) {
		requireValidCodes(request);
		JsonText.requireValidOrNull(objectMapper, "filmingGuide", request.filmingGuide());
		Exercise exercise = findOrThrow(id);
		// null = form không gửi hai danh sách này (client cũ): giữ nguyên, không xoá.
		String[] stepsVi = request.stepsVi() == null ? exercise.getStepsVi() : cleanLines(request.stepsVi());
		String[] mistakesVi = request.mistakesVi() == null ? exercise.getMistakesVi() : cleanLines(request.mistakesVi());
		exercise.update(
				request.nameEn(), request.nameVi(), toArray(request.muscleGroups()),
				toArray(request.equipment()), request.description(), blankToNull(request.filmingGuide()),
				stepsVi, mistakesVi, request.active());
		exercises.save(exercise);
		return withCount(exercise);
	}

	public ExerciseResponse deactivate(UUID id) {
		Exercise exercise = findOrThrow(id);
		exercise.deactivate();
		exercises.save(exercise);
		return withCount(exercise);
	}

	/**
	 * §5.5 ke-hoach-chi-tiet-chuc-nang-v1.md — thiếu thiết bị thì đề xuất bài thay thế cùng nhóm cơ,
	 * lọc theo thiết bị người dùng đang có. Lọc trong Java thay vì viết query GIN: đọc dễ hơn.
	 *
	 * ponytail: quét toàn bảng exercises mỗi lần gọi. Đo 11-03 trên DB dev 1.328 bài: 40–100 ms cả
	 * request. Lên hàng chục nghìn bài hoặc chậm quá ~200 ms thì đổi sang query `muscle_groups && ARRAY[...]`.
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
		Map<UUID, List<FormCheck>> checks = activeChecks();
		Map<String, Set<String>> imageKinds = images.kindsBySlug();

		return exercises.findAll().stream()
				.filter(Exercise::isActive)
				.filter(e -> !e.getId().equals(exerciseId))
				.filter(e -> List.of(e.getMuscleGroups()).contains(primaryMuscle))
				.filter(e -> userEquipment.containsAll(List.of(e.getEquipment())))
				.sorted(Comparator.comparingLong((Exercise e) -> overlap(e, allMuscles)).reversed())
				.map(e -> toResponse(e, checks.getOrDefault(e.getId(), List.of()), imageKinds))
				.toList();
	}

	private Map<UUID, List<FormCheck>> activeChecks() {
		return formChecks.findByActiveTrue().stream().collect(Collectors.groupingBy(FormCheck::getExerciseId));
	}

	private ExerciseResponse withCount(Exercise exercise) {
		return toResponse(exercise, formChecks.findByExerciseIdAndActiveTrueOrderByPriority(exercise.getId()),
				images.kindsBySlug());
	}

	/** checkViews theo thứ tự camera hướng dẫn: Ngang → Chính diện → Chéo. */
	private static ExerciseResponse toResponse(
			Exercise exercise, List<FormCheck> checks, Map<String, Set<String>> imageKinds) {
		List<String> views = FormMeasures.VIEW_ORDER.stream()
				.filter(v -> checks.stream().anyMatch(c -> v.equals(c.getView())))
				.toList();
		return ExerciseResponse.from(exercise, checks.size(), views,
				imageKinds.getOrDefault(exercise.getSlug(), Set.of()));
	}

	private Exercise findOrThrow(UUID id) {
		return exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	private static long overlap(Exercise exercise, Set<String> muscles) {
		return Arrays.stream(exercise.getMuscleGroups()).filter(muscles::contains).count();
	}

	/**
	 * Phần tử đầu của muscleGroups là cơ chính: màn người tập tô nổi, gợi ý bài thay thế tìm theo nó
	 * (substitutes) — nên bắt buộc có. Mã lạ thì chặn, không lưu nhãn mà không màn nào hiểu.
	 */
	private static void requireValidCodes(ExerciseRequest request) {
		List<String> muscles = request.muscleGroups() == null ? List.of() : request.muscleGroups();
		if (muscles.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn cơ chính cho bài.");
		}
		List<String> badMuscles = muscles.stream().filter(m -> m == null || !ContentCodes.MUSCLES.contains(m)).toList();
		if (!badMuscles.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhóm cơ không hợp lệ: " + String.join(", ", badMuscles));
		}
		List<String> equipment = request.equipment() == null ? List.of() : request.equipment();
		List<String> badEquipment = equipment.stream().filter(e -> e == null || !ContentCodes.EQUIPMENT.contains(e)).toList();
		if (!badEquipment.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiết bị không hợp lệ: " + String.join(", ", badEquipment));
		}
	}

	/** Textarea rỗng gửi lên là "" — cột jsonb không nhận chuỗi rỗng, đổi thành NULL. */
	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	/**
	 * Mỗi dòng cắt khoảng trắng hai đầu, dòng trống bỏ đi: ô nhập nhiều dòng hay dư dòng trắng.
	 * Phần tử null (gọi API thẳng, @Size không bắt null) bỏ như dòng trống, không thành lỗi 500.
	 */
	private static String[] cleanLines(List<String> lines) {
		return lines == null ? new String[0]
				: lines.stream().filter(Objects::nonNull).map(String::strip).filter(l -> !l.isEmpty()).toArray(String[]::new);
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
