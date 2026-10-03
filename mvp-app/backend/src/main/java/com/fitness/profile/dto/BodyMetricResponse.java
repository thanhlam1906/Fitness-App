package com.fitness.profile.dto;

import com.fitness.profile.entity.BodyMetric;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

public record BodyMetricResponse(BigDecimal heightCm, BigDecimal weightKg, LocalDate measuredOn) {

	public static BodyMetricResponse of(BodyMetric m) {
		return new BodyMetricResponse(m.getHeightCm(), m.getWeightKg(), m.getMeasuredOn());
	}

	/**
	 * Số mới nhất của từng chỉ số, từ `all` xếp mới trước. Mỗi lần cập nhật có thể chỉ gửi một
	 * chỉ số (màn Lịch sử cân nặng chỉ gửi cân nặng) nên lấy nguyên dòng mới nhất là mất chỉ số
	 * kia (code-reviewer 09-29 #3). measuredOn = lần đo gần nhất. Không có lần đo nào → null.
	 */
	public static BodyMetricResponse latestOf(List<BodyMetric> all) {
		if (all.isEmpty()) {
			return null;
		}
		return new BodyMetricResponse(
				all.stream().map(BodyMetric::getHeightCm).filter(Objects::nonNull).findFirst().orElse(null),
				all.stream().map(BodyMetric::getWeightKg).filter(Objects::nonNull).findFirst().orElse(null),
				all.get(0).getMeasuredOn());
	}
}
