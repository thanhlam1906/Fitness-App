package com.fitness.admin.dto;

import java.util.List;
import java.util.UUID;

/**
 * Trang Tổng quan của admin. `sessions` và `missedWorkouts` cùng nghĩa với `summary` của trang
 * Buổi tập (buổi DONE và buổi lỡ trong khoảng). `goals` luôn đủ 5 mã theo thứ tự cố định, đếm người
 * đang có chương trình chạy.
 */
public record AdminDashboardResponse(
		int days, int sessions, int missedWorkouts,
		List<GoalCountResponse> goals, List<ProgramStatResponse> programs) {

	/** goal = MUSCLE, FAT_LOSS, STRENGTH, GENERAL hoặc NONE (chưa chọn). */
	public record GoalCountResponse(String goal, int users) {
	}

	/** templateId null = lịch tự thiết kế (kèm buổi ngoài lịch). users = số người đang theo. */
	public record ProgramStatResponse(UUID templateId, String name, int users, int done, int missed) {
	}
}
