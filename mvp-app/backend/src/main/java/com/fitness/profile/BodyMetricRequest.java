package com.fitness.profile;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A3 — chiều cao và cân nặng nhập tay. measuredOn null = hôm nay. */
public record BodyMetricRequest(BigDecimal heightCm, BigDecimal weightKg, LocalDate measuredOn) {
}
