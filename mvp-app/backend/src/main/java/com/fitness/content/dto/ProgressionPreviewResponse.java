package com.fitness.content.dto;

import com.fitness.program.service.progression.LoadDecisionResult;
import java.util.Map;

/** Kết quả engine trên buổi giả định — cùng ruleId, ruleParams, messageVi người tập sẽ thấy. */
public record ProgressionPreviewResponse(
		String direction, Double deltaKg, double newLoadKg, String ruleId, Map<String, Object> ruleParams,
		String messageVi) {

	public static ProgressionPreviewResponse from(LoadDecisionResult d, double loadKg) {
		return new ProgressionPreviewResponse(d.direction().name(), d.deltaKg(),
				loadKg + (d.deltaKg() == null ? 0 : d.deltaKg()), d.ruleId(), d.ruleParams(), d.messageVi());
	}
}
