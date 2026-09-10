package com.fitness.content;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record FormCheckResponse(
		UUID id,
		UUID exerciseId,
		String code,
		String metric,
		List<String> validViewpoints,
		String thresholds,
		BigDecimal confidenceMin,
		String cuePassVi,
		String cueWarnVi,
		String cueFailVi,
		short priority,
		boolean active) {

	static FormCheckResponse from(FormCheck f) {
		return new FormCheckResponse(
				f.getId(), f.getExerciseId(), f.getCode(), f.getMetric(), List.of(f.getValidViewpoints()),
				f.getThresholds(), f.getConfidenceMin(), f.getCuePassVi(), f.getCueWarnVi(),
				f.getCueFailVi(), f.getPriority(), f.isActive());
	}
}
