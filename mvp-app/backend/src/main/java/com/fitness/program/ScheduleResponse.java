package com.fitness.program;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * restDays và startDate đi kèm vì màn lịch tuần vẽ đủ 7 ô ngày — ô không có
 * buổi phải phân biệt "ngày nghỉ đã chọn" với "chưa sinh lịch tới đó"
 * (§5.2 ke-hoach-chi-tiet-chuc-nang-v1.md). 1=T2 … 7=CN.
 */
public record ScheduleResponse(
		UUID programId,
		LocalDate startDate,
		List<Short> restDays,
		List<ScheduledWorkoutView> workouts) {
}
