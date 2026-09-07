package com.fitness.program;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * restDays: 1=Thứ 2 … 7=Chủ nhật (V1__init.sql), khớp trực tiếp DayOfWeek.getValue().
 * startDate null → mặc định hôm nay, xử lý ở controller.
 */
public record CreateProgramRequest(
		@NotNull UUID templateId,
		Map<String, Double> startingLoadsBySlug,
		List<Integer> restDays,
		LocalDate startDate) {
}
