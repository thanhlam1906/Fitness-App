package com.fitness.admin.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Trang Tổng quan của admin. `sessions` và `missedWorkouts` cùng nghĩa với `summary` của trang
 * Buổi tập (buổi DONE và buổi lỡ trong khoảng). `goals` luôn đủ 5 mã theo thứ tự cố định, đếm người
 * đang có chương trình chạy. Các trường còn lại: doc/design-tong-quan-v2-v1.md §2–3; `timelineUnit` là
 * DAY hoặc WEEK, `timeline` đủ mọi điểm của khoảng.
 */
public record AdminDashboardResponse(
		int days, int sessions, int missedWorkouts,
		List<GoalCountResponse> goals, List<ProgramStatResponse> programs,
		int formCheckTotal, List<FormCheckStatResponse> topFormChecks,
		String timelineUnit, List<TimelinePointResponse> timeline, int assistantAskers) {

	/** goal = MUSCLE, FAT_LOSS, STRENGTH, GENERAL hoặc NONE (chưa chọn). */
	public record GoalCountResponse(String goal, int users) {
	}

	/** templateId null = lịch tự thiết kế (kèm buổi ngoài lịch). users = số người đang theo. */
	public record ProgramStatResponse(UUID templateId, String name, int users, int done, int missed) {
	}

	/** checks = lượt chấm xong của bài trong khoảng, users = số người đã chấm bài đó. */
	public record FormCheckStatResponse(UUID exerciseId, String name, int checks, int users) {
	}

	/** start = ngày đầu của điểm. wrong* = góp ý bị báo sai theo nguồn; questions = câu gửi trợ lý; askers = số người hỏi. */
	public record TimelinePointResponse(
			LocalDate start, int wrongForm, int wrongLoad, int wrongAssistant, int questions, int askers) {
	}
}
