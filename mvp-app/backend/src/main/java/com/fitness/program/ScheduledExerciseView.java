package com.fitness.program;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * exerciseId (khác id — id là dòng scheduled_exercises) cần cho log set và
 * cho luồng thay bài. loadDecision là "lý do rule hiển thị ngay tại chỗ" ở
 * §5.2 ke-hoach-chi-tiet-chuc-nang-v1.md; mang theo id để nút "góp ý này sai"
 * gắn được vào đúng quyết định.
 */
public record ScheduledExerciseView(
		UUID id,
		UUID exerciseId,
		String exerciseSlug,
		String exerciseName,
		boolean analyzable,
		int orderIndex,
		int targetSets,
		int targetReps,
		int targetRepsMax,
		BigDecimal targetLoadKg,
		Integer restSeconds,
		String substitutedFromName,
		LoadDecisionView loadDecision) {

	public record LoadDecisionView(UUID id, String direction, BigDecimal deltaKg, String messageVi) {

		static LoadDecisionView from(LoadDecision d) {
			return new LoadDecisionView(d.getId(), d.getDirection(), d.getDeltaKg(), d.getMessageVi());
		}
	}
}
