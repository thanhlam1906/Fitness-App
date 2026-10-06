package com.fitness.program.service.progression;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Con số của bộ quy tắc tăng tạ, admin chỉnh theo từng template (doc/design-template-admin-v1.md §4.2).
 * Logic 4 quy tắc vẫn cố định trong code; chỉ ngưỡng đổi. Template cũ thiếu khoá thì lấy mặc định,
 * mặc định đúng bằng hằng số trước đây nên bật tính năng không đổi hành vi.
 *
 * incrementKg: giá trị null = admin chọn "Không tự tăng"; thiếu khoá = chưa chọn. Engine coi cả hai
 * là bỏ qua bài, chỉ form admin phân biệt.
 */
public record ProgressionConfig(
		double targetRpe,
		int rpeLowStreak,
		double rpeOver,
		double minCompletionPct,
		int missedSetsToDeload,
		int failStreakToDeload,
		double deloadPct,
		Map<String, BigDecimal> incrementKg) {

	public static final ProgressionConfig DEFAULT = new ProgressionConfig(8, 2, 1, 70, 2, 2, 10, Map.of());

	public static ProgressionConfig from(JsonNode n) {
		// LinkedHashMap vì Map.copyOf không nhận giá trị null.
		Map<String, BigDecimal> inc = new LinkedHashMap<>();
		n.path("increment_kg").fields().forEachRemaining(e ->
				inc.put(e.getKey(), e.getValue().isNull() ? null : e.getValue().decimalValue()));
		return new ProgressionConfig(
				n.path("target_rpe").asDouble(DEFAULT.targetRpe),
				n.path("rpe_low_streak").asInt(DEFAULT.rpeLowStreak),
				n.path("rpe_over").asDouble(DEFAULT.rpeOver),
				n.path("min_completion_pct").asDouble(DEFAULT.minCompletionPct),
				n.path("missed_sets_to_deload").asInt(DEFAULT.missedSetsToDeload),
				n.path("fail_streak_to_deload").asInt(DEFAULT.failStreakToDeload),
				n.path("deload_pct").asDouble(DEFAULT.deloadPct),
				Collections.unmodifiableMap(inc));
	}

	/** Ghi lại cột progression. Không ghi "mode": trước đây không ai đọc. */
	public ObjectNode toJson(ObjectMapper mapper) {
		ObjectNode n = mapper.createObjectNode();
		n.put("target_rpe", targetRpe);
		n.put("rpe_low_streak", rpeLowStreak);
		n.put("rpe_over", rpeOver);
		n.put("min_completion_pct", minCompletionPct);
		n.put("missed_sets_to_deload", missedSetsToDeload);
		n.put("fail_streak_to_deload", failStreakToDeload);
		n.put("deload_pct", deloadPct);
		ObjectNode inc = n.putObject("increment_kg");
		incrementKg.forEach((slug, kg) -> {
			if (kg == null) {
				inc.putNull(slug);
			} else {
				inc.put(slug, kg);
			}
		});
		return n;
	}

	/** null = bài không tự tăng tạ (hoặc admin chưa chọn) — engine bỏ qua bài. */
	public BigDecimal incrementFor(String slug) {
		return incrementKg.get(slug);
	}
}
