package com.fitness.admin.dto;

import java.util.List;
import java.util.UUID;

/**
 * Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md §4, §6). Mỗi danh sách tối đa 5 dòng,
 * đã sắp theo tỉ lệ giảm dần. templateId null = "Tất cả".
 */
public record WorkoutInsightsResponse(
		int days, UUID templateId,
		SummaryResponse summary,
		List<SkippedResponse> skipped,
		List<RpeOverResponse> rpeOver,
		List<RepShortResponse> repShort,
		List<SubstitutedResponse> substituted,
		List<PainResponse> pain,
		List<LoadDecisionResponse> loadDecisions) {

	/**
	 * Tổng cả khoảng cho 4 ô tổng và 3 biểu đồ tròn (spec §10). Tính trên mọi dòng sau khi lọc template,
	 * kể cả bài bị ẩn vì dưới 10 set, nên không cộng lại được từ các danh sách top 5.
	 */
	public record SummaryResponse(
			int sessions, int users, int missedWorkouts,
			int sets, int skippedSets, List<CountResponse> skipReasons,
			int rpeLogs, int overCount,
			int painReports, int painUsers, double avgPainSeverity,
			int up, int hold, int down) {
	}

	/** Một phần của biểu đồ tròn: mã (vd. lý do bỏ set) và số lần. */
	public record CountResponse(String key, int count) {
	}

	/** users = số người đã bỏ ít nhất một set của bài. topReason = mã SKIP_REASONS. */
	public record SkippedResponse(
			UUID exerciseId, String exerciseName, int sets, int skippedSets, int users, String topReason) {
	}

	/** rpeLogs = số set không bỏ có ghi RPE; overCount = số lần RPE > mục tiêu + mức vượt của template. */
	public record RpeOverResponse(UUID exerciseId, String exerciseName, int rpeLogs, int overCount, double avgRpe) {
	}

	/** sets = số set không bỏ, có rep, thuộc buổi có lịch; avgFloor = sàn khoảng rep trung bình. */
	public record RepShortResponse(
			UUID exerciseId, String exerciseName, int sets, int shortSets, double avgReps, double avgFloor) {
	}

	/** exerciseId = bài gốc trong lịch. Đếm theo người vì đổi bài áp cho mọi buổi còn lại. */
	public record SubstitutedResponse(
			UUID exerciseId, String exerciseName, int usersSubstituted, int usersScheduled,
			String topReplacementName) {
	}

	/** bodyArea = mã BODY_AREAS; topExerciseName = bài có mặt trong nhiều buổi báo đau nhất. */
	public record PainResponse(String bodyArea, int reports, int users, double avgSeverity, String topExerciseName) {
	}

	/** key = templateId khi lọc "Tất cả" (null = lịch tự thiết kế), exerciseId khi lọc một template. */
	public record LoadDecisionResponse(UUID key, String name, int up, int hold, int down, String topDownRule) {
	}
}
