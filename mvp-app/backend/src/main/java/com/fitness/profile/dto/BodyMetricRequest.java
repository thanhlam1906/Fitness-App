package com.fitness.profile.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A3 — chiều cao và cân nặng nhập tay. measuredOn null = hôm nay. null = không đổi chỉ số đó.
 * Khoảng hợp lệ cùng với cột chọn ở onboarding (HEIGHTS 120–220, WHOLE_KG 30–200 + phần lẻ):
 * gõ nhầm "-72" hay "0" từng kéo lệch cả đường cân nặng, ≥ 1000 thì cột numeric(5,2) báo 500.
 */
public record BodyMetricRequest(
		@DecimalMin("120") @DecimalMax("220") BigDecimal heightCm,
		@DecimalMin("30") @DecimalMax("200.9") BigDecimal weightKg,
		LocalDate measuredOn) {
}
