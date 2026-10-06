package com.fitness.content.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Form template của admin (doc/design-template-admin-v1.md §5.2). Không có slug: backend sinh từ tên
 * khi tạo, giữ nguyên khi sửa. Khoảng số ở đây; kiểm cần DB (bài tồn tại, bài có dụng cụ) ở service.
 */
public record ProgramTemplateRequest(
		@NotBlank @Size(max = 120) String name,
		String methodology,
		@Min(1) @Max(7) short sessionsMin,
		@Min(1) @Max(7) short sessionsMax,
		@NotNull List<String> requiredEquipment,
		boolean active,
		@NotEmpty List<@Valid @NotNull DayRequest> days,
		@NotNull @Valid ProgressionRequest progression) {

	public record DayRequest(
			@NotBlank @Size(max = 40) String label,
			@NotEmpty List<@Valid @NotNull TemplateExerciseRequest> exercises) {
	}

	/** reps tới 300 vì bài giữ tư thế (plank) dùng ô rep để ghi giây. */
	public record TemplateExerciseRequest(
			@NotBlank String slug,
			@Min(1) @Max(10) int sets,
			@Min(1) @Max(300) int repsMin,
			@Min(1) @Max(300) int repsMax,
			@Min(0) @Max(600) int restSec) {
	}

	/** incrementKg: giá trị null = "Không tự tăng". Khoảng 0 < kg ≤ 20 kiểm ở service (Map value). */
	public record ProgressionRequest(
			@DecimalMin("1") @DecimalMax("10") double targetRpe,
			@Min(1) @Max(10) int rpeLowStreak,
			@DecimalMin("0") @DecimalMax("5") double rpeOver,
			@DecimalMin("0") @DecimalMax("100") double minCompletionPct,
			@Min(1) @Max(10) int missedSetsToDeload,
			@Min(1) @Max(10) int failStreakToDeload,
			@DecimalMin("1") @DecimalMax("50") double deloadPct,
			@NotNull Map<String, BigDecimal> incrementKg) {
	}
}
