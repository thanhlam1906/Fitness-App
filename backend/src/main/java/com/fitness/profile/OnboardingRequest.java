package com.fitness.profile;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** A4–A6 kế-hoach-chi-tiet-chuc-nang-v1.md §4. Disclaimer/body metrics chưa có endpoint ở đợt này. */
public record OnboardingRequest(
		@NotNull String goal,
		@NotNull String experience,
		@NotNull Short sessionsPerWeek,
		@NotEmpty List<String> equipment) {
}
