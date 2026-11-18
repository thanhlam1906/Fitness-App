package com.fitness.program.service.progression;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Vùng đau người tập chọn trên hình → nhóm cơ của bài, để chỉ giảm tạ bài liên quan (người dùng
 * duyệt bảng 11-18). Vùng khớp lấy các cơ bám quanh khớp: gối → đùi trước, đùi sau.
 *
 * Mã vùng trùng BODY_AREAS ở web và mobile. Vùng không có ở đây (đầu, cổ, "Chỗ khác", hay mã lạ)
 * không biết bài nào liên quan nên tính là ảnh hưởng mọi bài, giữ cách cũ cho an toàn.
 */
public final class PainAreas {

	private static final Map<String, Set<String>> MUSCLES_BY_AREA = Map.ofEntries(
			Map.entry("SHOULDER_L", Set.of("SHOULDERS")),
			Map.entry("SHOULDER_R", Set.of("SHOULDERS")),
			Map.entry("CHEST", Set.of("CHEST")),
			Map.entry("UPPER_BACK", Set.of("UPPER_BACK", "LATS")),
			Map.entry("LOWER_BACK", Set.of("LOWER_BACK")),
			Map.entry("ABS", Set.of("CORE")),
			Map.entry("ARM", Set.of("BICEPS", "TRICEPS")),
			Map.entry("ELBOW", Set.of("BICEPS", "TRICEPS", "FOREARMS")),
			Map.entry("WRIST", Set.of("FOREARMS")),
			Map.entry("HIP", Set.of("GLUTES", "ADDUCTORS", "ABDUCTORS")),
			Map.entry("THIGH", Set.of("QUADS", "HAMSTRINGS", "ADDUCTORS")),
			Map.entry("KNEE_L", Set.of("QUADS", "HAMSTRINGS")),
			Map.entry("KNEE_R", Set.of("QUADS", "HAMSTRINGS")),
			Map.entry("SHIN", Set.of("CALVES")),
			Map.entry("FOOT", Set.of("CALVES")));

	private PainAreas() {
	}

	/** Bài có nhóm cơ nằm trong một vùng đau đã báo. Bài chưa có nhóm cơ thì tính là liên quan. */
	public static boolean affects(Collection<String> painAreas, String[] muscleGroups) {
		if (painAreas.isEmpty()) {
			return false;
		}
		List<String> muscles = List.of(muscleGroups);
		if (muscles.isEmpty()) {
			return true;
		}
		return painAreas.stream().anyMatch(area -> {
			Set<String> related = MUSCLES_BY_AREA.get(area);
			return related == null || muscles.stream().anyMatch(related::contains);
		});
	}
}
