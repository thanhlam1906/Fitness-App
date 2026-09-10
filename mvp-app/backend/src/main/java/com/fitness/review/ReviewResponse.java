package com.fitness.review;

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

	public record CheckResult(
			UUID id,
			String code,
			String verdict,
			BigDecimal confidence,
			String measured,
			String cueTextVi,
			boolean isPrimary) {
	}
}
