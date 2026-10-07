package com.fitness.admin.dto;

import java.util.Map;

/**
 * Bốn ô thống kê đầu màn Người dùng — chỉ đếm người tập (role USER). `statusCounts` là số trên
 * các tab (ALL, TRAINING, NOT_STARTED, IDLE, LOCKED), đếm mọi tài khoản. `wrongFeedbackCount` là
 * badge "Góp ý bị báo sai" ở sidebar.
 */
public record AdminOverviewResponse(
		long traineeCount, long newTraineesLast7Days, long activeTraineesLast7Days,
		long notStartedTrainees, long traineeSessionsLast7Days,
		Map<String, Long> statusCounts, long wrongFeedbackCount) {
}
