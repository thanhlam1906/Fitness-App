package com.fitness.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;

/**
 * A2–A6 ke-hoach-chi-tiet-chuc-nang-v1.md §4. MỌI trường tuỳ chọn: màn
 * onboarding gửi PATCH sau mỗi bước, chỉ kèm trường của bước đó. null = giữ
 * nguyên giá trị cũ (Profile.patch).
 */
public record ProfilePatchRequest(
		String goal,
		String experience,
		@Min(2) @Max(6) Short sessionsPerWeek,
		List<String> equipment,
		Short birthYear,
		String gender,
		Boolean acceptDisclaimer,
		String onboardingStep) {
}
