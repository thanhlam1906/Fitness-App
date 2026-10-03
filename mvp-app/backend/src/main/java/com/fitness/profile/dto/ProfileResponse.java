package com.fitness.profile.dto;

import com.fitness.profile.entity.Profile;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/** Màn 2 (onboarding, resume dở dang) và màn 10 (hồ sơ & cài đặt) concept-frontend-v1.md. */
public record ProfileResponse(
		String fullName,
		String goal,
		String experience,
		Short sessionsPerWeek,
		List<String> equipment,
		Short birthYear,
		String gender,
		Instant disclaimerAt,
		String onboardingStep,
		BodyMetricResponse latestBodyMetric) {

	public static ProfileResponse of(Profile p, BodyMetricResponse latest) {
		return new ProfileResponse(
				p.getFullName(), p.getGoal(), p.getExperience(), p.getSessionsPerWeek(), List.of(p.getEquipment()),
				p.getBirthYear(), p.getGender(), p.getDisclaimerAt(), p.getOnboardingStep(), latest);
	}
}
