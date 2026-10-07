package com.fitness.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AdminUserDetailResponse(
		AdminUserRowResponse user,
		String fullName,
		String phone,
		boolean mustChangePassword,
		String goal,
		String experience,
		Short sessionsPerWeek,
		List<String> equipment,
		Short birthYear,
		String gender,
		Instant disclaimerAt,
		String onboardingStep,
		BigDecimal heightCm,
		BigDecimal weightKg,
		LocalDate measuredOn,
		String activeProgramName) {
}
