package com.fitness.program.progression;

/**
 * Tín hiệu đầu vào ĐÃ TỔNG HỢP cho một (user, bài) sau một tuần. Việc gộp từ
 * set_logs/pain_reports/workout_sessions thành các trường dưới đây là việc
 * của service gọi engine (chưa build ở đợt này) — engine chỉ quyết định trên
 * dữ liệu đã sẵn, giữ nó thuần và test được không cần DB.
 *
 * rpeBelowTargetStreak = null nghĩa là thiếu RPE tuần đó — "hỏi mềm, bỏ qua
 * được, thiếu RPE thì bài đó chỉ chạy double progression" (kế hoạch chức
 * năng §5.3). null KHÔNG phải 0.
 */
public record ProgressionSignal(
		boolean painReported,
		boolean painRepeatedFromLastWeek,
		double completionRate,
		Integer rpeBelowTargetStreak,
		boolean rpeAboveTargetPlusOne,
		int setsMetTarget,
		int setsTotal,
		int consecutiveFailStreak,
		double currentLoadKg,
		double incrementKg,
		double deloadPct) {
}
