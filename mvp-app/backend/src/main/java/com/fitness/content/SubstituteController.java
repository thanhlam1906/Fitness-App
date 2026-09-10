package com.fitness.content;

import com.fitness.common.CurrentUser;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * §5.5 ke-hoach-chi-tiet-chuc-nang-v1.md — thiếu thiết bị thì đề xuất bài thay
 * thế cùng nhóm cơ, lọc theo thiết bị người dùng đang có. Lọc trong Java trên
 * ~40 bài thay vì viết query GIN: bảng nhỏ, đọc dễ hơn.
 *
 * ponytail: quét toàn bảng exercises mỗi lần gọi. Trần là vài chục bài — nếu
 * catalog lên hàng nghìn thì đổi sang query `muscle_groups && ARRAY[...]`.
 */
@RestController
@RequestMapping("/api/v1/exercises/{id}/substitutes")
public class SubstituteController {

	private final ExerciseRepository exercises;
	private final FormCheckRepository formChecks;
	private final ProfileRepository profiles;
	private final CurrentUser currentUser;

	public SubstituteController(
			ExerciseRepository exercises, FormCheckRepository formChecks,
			ProfileRepository profiles, CurrentUser currentUser) {
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.profiles = profiles;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<ExerciseResponse> list(@PathVariable UUID id) {
		Exercise original = exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));

		Set<String> userEquipment = profiles.findById(currentUser.id())
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

		Map<UUID, Long> checkCounts = new HashMap<>();
		for (Object[] row : formChecks.countActivePerExercise()) {
			checkCounts.put((UUID) row[0], (Long) row[1]);
		}

		return exercises.findAll().stream()
				.filter(Exercise::isActive)
				.filter(e -> !e.getId().equals(id))
				.filter(e -> List.of(e.getMuscleGroups()).contains(primaryMuscle))
				.filter(e -> userEquipment.containsAll(List.of(e.getEquipment())))
				.sorted(Comparator.comparingLong((Exercise e) -> overlap(e, allMuscles)).reversed())
				.map(e -> ExerciseResponse.from(e, checkCounts.getOrDefault(e.getId(), 0L)))
				.toList();
	}

	private static long overlap(Exercise exercise, Set<String> muscles) {
		return Arrays.stream(exercise.getMuscleGroups()).filter(muscles::contains).count();
	}
}
