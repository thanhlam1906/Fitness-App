package com.fitness.profile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Màn 2 (onboarding, resume dở dang) và màn 10 (hồ sơ & cài đặt) concept-frontend-v1.md. */
public record ProfileResponse(
		String goal,
		String experience,
		Short sessionsPerWeek,
		List<String> equipment,
		Short birthYear,
		String gender,
		Instant disclaimerAt,
		String onboardingStep,
		BodyMetricView latestBodyMetric) {

	public record BodyMetricView(BigDecimal heightCm, BigDecimal weightKg, LocalDate measuredOn) {
	}

	static ProfileResponse of(Profile p, BodyMetric latest) {
		return new ProfileResponse(
				p.getGoal(), p.getExperience(), p.getSessionsPerWeek(), List.of(p.getEquipment()),
				p.getBirthYear(), p.getGender(), p.getDisclaimerAt(), p.getOnboardingStep(),
				latest == null ? null
						: new BodyMetricView(latest.getHeightCm(), latest.getWeightKg(), latest.getMeasuredOn()));
	}
}
