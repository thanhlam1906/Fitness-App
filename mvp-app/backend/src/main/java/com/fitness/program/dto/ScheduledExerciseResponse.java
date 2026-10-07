package com.fitness.program.dto;

import com.fitness.program.entity.LoadDecision;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * exerciseId (khác id — id là dòng scheduled_exercises) cần cho log set và
 * cho luồng thay bài. loadDecision là "lý do rule hiển thị ngay tại chỗ" ở
 * §5.2 ke-hoach-chi-tiet-chuc-nang-v1.md; mang theo id để nút "góp ý này sai"
 * gắn được vào đúng quyết định.
 */
public record ScheduledExerciseResponse(
		UUID id,
		UUID exerciseId,
		String exerciseSlug,
		String exerciseName,
		String description,
		/** Phần tử đầu là cơ chính — khung chi tiết bài tô accent nhóm này. */
		List<String> muscleGroups,
		List<String> stepsVi,
		List<String> mistakesVi,
		boolean analyzable,
		int orderIndex,
		int targetSets,
		int targetReps,
		int targetRepsMax,
		BigDecimal targetLoadKg,
		Integer restSeconds,
		String substitutedFromName,
		LoadDecisionResponse loadDecision) {

	public record LoadDecisionResponse(UUID id, String direction, BigDecimal deltaKg, String messageVi) {

		public static LoadDecisionResponse from(LoadDecision d) {
			return new LoadDecisionResponse(d.getId(), d.getDirection(), d.getDeltaKg(), d.getMessageVi());
		}
	}
}
