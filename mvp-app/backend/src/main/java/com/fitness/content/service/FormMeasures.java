package com.fitness.content.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Bảng số đo admin chọn được khi khai báo khớp cần kiểm (doc/design-cham-form-nguong-v1.md §3).
 * Khoá trùng analyzer `feature_keys.py` và web `src/lib/formMeasures.ts`: thêm khoá thì thêm cả ba.
 * Mỗi số chỉ đo đúng ở vài góc: nhìn chính diện thì khớp gập về phía camera nên góc gối bị méo,
 * nhìn ngang thì hai bên chồng nhau nên không so được trái – phải.
 */
final class FormMeasures {

	static final List<String> VIEW_ORDER = List.of("SAGITTAL", "FRONTAL", "DIAGONAL");

	private static final Set<String> SIDE = Set.of("SAGITTAL", "DIAGONAL");
	private static final Set<String> FRONT = Set.of("FRONTAL", "DIAGONAL");

	record Measure(int max, Set<String> views) {
	}

	static final Map<String, Measure> MEASURES = Map.ofEntries(
			Map.entry("ankle", new Measure(180, SIDE)),
			Map.entry("knee", new Measure(180, SIDE)),
			Map.entry("hip", new Measure(180, SIDE)),
			Map.entry("shoulder", new Measure(180, Set.copyOf(VIEW_ORDER))),
			Map.entry("elbow", new Measure(180, SIDE)),
			Map.entry("torso", new Measure(90, SIDE)),
			Map.entry("line", new Measure(180, SIDE)),
			Map.entry("valgus", new Measure(40, FRONT)),
			Map.entry("asym_knee", new Measure(45, FRONT)),
			Map.entry("asym_hip", new Measure(45, FRONT)),
			Map.entry("asym_shoulder", new Measure(45, FRONT)));

	private FormMeasures() {
	}
}
