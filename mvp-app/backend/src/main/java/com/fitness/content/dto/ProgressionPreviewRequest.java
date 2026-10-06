package com.fitness.content.dto;

import com.fitness.content.dto.ProgramTemplateRequest.ProgressionRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * "Thử quy tắc" của admin: quy tắc đang sửa (chưa lưu) + một buổi giả định của một bài.
 * reps: rep từng set, null = set bị bỏ. rpe null = không ghi RPE.
 */
public record ProgressionPreviewRequest(
		@NotNull @Valid ProgressionRequest progression,
		@NotBlank String slug,
		@Min(1) @Max(10) int sets,
		@Min(1) @Max(300) int repsMin,
		@Min(1) @Max(300) int repsMax,
		@DecimalMin("0") @DecimalMax("1000") double loadKg,
		@NotNull List<@Min(0) @Max(300) Integer> reps,
		@DecimalMin("1") @DecimalMax("10") Double rpe,
		boolean pain,
		boolean painBefore,
		@Min(0) @Max(50) int failStreakBefore,
		@Min(0) @Max(50) int rpeLowStreakBefore) {
}
