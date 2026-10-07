package com.fitness.workout.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProgressResponse(
		int weeks, long sessionsStarted, long sessionsFinished, BigDecimal totalTonnageKg, Double avgSessionRpe,
		List<WeekResponse> weekly) {

	/** from là Instant, không LocalDate: web tự đổi sang ngày theo giờ máy người dùng. */
	public record WeekResponse(Instant from, BigDecimal tonnageKg) {
	}
}
