package com.fitness.profile.service;

import com.fitness.profile.dto.BodyMetricRequest;
import com.fitness.profile.dto.BodyMetricResponse;
import com.fitness.profile.dto.ProfilePatchRequest;
import com.fitness.profile.dto.ProfileResponse;
import com.fitness.profile.entity.BodyMetric;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.BodyMetricRepository;
import com.fitness.profile.repository.ProfileRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ProfileService {

	private final ProfileRepository profiles;
	private final BodyMetricRepository bodyMetrics;

	public ProfileService(ProfileRepository profiles, BodyMetricRepository bodyMetrics) {
		this.profiles = profiles;
		this.bodyMetrics = bodyMetrics;
	}

	/** Chưa có dòng profiles = user vừa đăng ký. Trả hồ sơ rỗng ở bước DISCLAIMER, không 404. */
	public ProfileResponse get(UUID userId) {
		Profile profile = profiles.findById(userId).orElseGet(() -> new Profile(userId));
		return ProfileResponse.of(profile, latestBodyMetric(userId));
	}

	public ProfileResponse patch(UUID userId, ProfilePatchRequest request) {
		Profile profile = profiles.findById(userId).orElseGet(() -> new Profile(userId));
		profile.patch(
				request.goal(), request.experience(), request.sessionsPerWeek(),
				request.equipment() == null ? null : request.equipment().toArray(new String[0]),
				request.birthYear(), request.gender(), request.acceptDisclaimer(), request.onboardingStep());
		profiles.save(profile);
		return ProfileResponse.of(profile, latestBodyMetric(userId));
	}

	/** Đo lại cùng ngày là ghi đè, không tạo dòng thứ hai — UNIQUE (user_id, measured_on). */
	public void addBodyMetric(UUID userId, BodyMetricRequest request) {
		LocalDate measuredOn = request.measuredOn() == null ? LocalDate.now() : request.measuredOn();
		BodyMetric metric = bodyMetrics.findByUserIdAndMeasuredOn(userId, measuredOn)
				.orElseGet(() -> new BodyMetric(userId, measuredOn));
		metric.apply(request.heightCm(), request.weightKg());
		bodyMetrics.save(metric);
	}

	/** Màn Cài đặt › Lịch sử cân nặng: mọi lần đo, mới nhất trước. */
	public List<BodyMetricResponse> bodyMetrics(UUID userId) {
		return bodyMetrics.findByUserIdOrderByMeasuredOnDesc(userId).stream()
				.map(BodyMetricResponse::of)
				.toList();
	}

	/**
	 * Hồ sơ của tài khoản vừa đăng ký. Bảng profiles thuộc feature này nên auth tạo qua đây, không tự
	 * save (spec chuẩn cấu trúc §4.4). Chạy trong transaction đăng ký của AuthService.
	 */
	public void createForNewUser(UUID userId, String fullName, String phone) {
		Profile profile = new Profile(userId);
		profile.applyRegistration(fullName, phone);
		profiles.save(profile);
	}

	private BodyMetricResponse latestBodyMetric(UUID userId) {
		return BodyMetricResponse.latestOf(bodyMetrics.findByUserIdOrderByMeasuredOnDesc(userId));
	}
}
