package com.fitness.profile.dto;

import com.fitness.profile.entity.BodyMetric;
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
		BodyMetricView latestBodyMetric) {

	public record BodyMetricView(BigDecimal heightCm, BigDecimal weightKg, LocalDate measuredOn) {

		public static BodyMetricView of(BodyMetric m) {
			return new BodyMetricView(m.getHeightCm(), m.getWeightKg(), m.getMeasuredOn());
		}

		/**
		 * Số mới nhất của từng chỉ số, từ `all` xếp mới trước. Mỗi lần cập nhật có thể chỉ gửi một
		 * chỉ số (màn Lịch sử cân nặng chỉ gửi cân nặng) nên lấy nguyên dòng mới nhất là mất chỉ số
		 * kia (code-reviewer 09-29 #3). measuredOn = lần đo gần nhất. Không có lần đo nào → null.
		 */
		public static BodyMetricView latestOf(List<BodyMetric> all) {
			if (all.isEmpty()) {
				return null;
			}
			return new BodyMetricView(
					all.stream().map(BodyMetric::getHeightCm).filter(Objects::nonNull).findFirst().orElse(null),
					all.stream().map(BodyMetric::getWeightKg).filter(Objects::nonNull).findFirst().orElse(null),
					all.get(0).getMeasuredOn());
		}
	}

	public static ProfileResponse of(Profile p, BodyMetricView latest) {
		return new ProfileResponse(
				p.getFullName(), p.getGoal(), p.getExperience(), p.getSessionsPerWeek(), List.of(p.getEquipment()),
				p.getBirthYear(), p.getGender(), p.getDisclaimerAt(), p.getOnboardingStep(), latest);
	}
}
