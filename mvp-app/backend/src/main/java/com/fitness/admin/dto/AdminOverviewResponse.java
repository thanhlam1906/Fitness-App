package com.fitness.admin.dto;

/** Bốn ô thống kê đầu màn 11 và các badge số trên sidebar admin. */
public record AdminOverviewResponse(
		long userCount, long activeLast7Days, long sessionsThisWeek,
		long reviewsInQueue, long wrongFeedbackCount) {
}
