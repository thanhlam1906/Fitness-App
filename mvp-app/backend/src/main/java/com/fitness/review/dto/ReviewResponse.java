package com.fitness.review.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Màn 9 concept-frontend-v1.md — kết quả chấm form. Mỗi check một dòng, đúng
 * một dòng isPrimary = "lỗi quan trọng nhất" (C5). reviewResultId đi kèm để
 * nút "góp ý này sai" (C6) gắn được vào đúng dòng.
 */
public record ReviewResponse(
		UUID id,
		UUID exerciseId,
		String exerciseName,
		String status,
		String rejectReason,
		String error,
		Instant createdAt,
		Instant finishedAt,
		List<String> viewpoints,
		List<CheckResult> checks) {

	/** code: kết quả rule cũ (qua form_checks). name: mục do LLM chấm (từ V11). */
	public record CheckResult(
			UUID id,
			String code,
			String name,
			String verdict,
			BigDecimal confidence,
			String measured,
			String cueTextVi,
			boolean isPrimary) {
	}
}
