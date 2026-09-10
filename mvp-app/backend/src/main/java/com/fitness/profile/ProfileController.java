package com.fitness.profile;

import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** concept-backend-v1.md §6: "/me/*" — userId luôn từ JWT, không bao giờ từ URL hay body. */
@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {

	private final ProfileRepository profiles;
	private final BodyMetricRepository bodyMetrics;
	private final CurrentUser currentUser;

	public ProfileController(
			ProfileRepository profiles, BodyMetricRepository bodyMetrics, CurrentUser currentUser) {
		this.profiles = profiles;
		this.bodyMetrics = bodyMetrics;
		this.currentUser = currentUser;
	}

	/** Chưa có dòng profiles = user vừa đăng ký. Trả hồ sơ rỗng ở bước DISCLAIMER, không 404. */
	@GetMapping("/profile")
	public ProfileResponse get() {
		UUID userId = currentUser.id();
		Profile profile = profiles.findById(userId).orElseGet(() -> new Profile(userId));
		return ProfileResponse.of(profile, latestBodyMetric(userId));
	}

	@PatchMapping("/profile")
	public ProfileResponse patch(@Valid @RequestBody ProfilePatchRequest request) {
		UUID userId = currentUser.id();
		Profile profile = profiles.findById(userId).orElseGet(() -> new Profile(userId));
		profile.patch(
				request.goal(), request.experience(), request.sessionsPerWeek(),
				request.equipment() == null ? null : request.equipment().toArray(new String[0]),
				request.birthYear(), request.gender(), request.acceptDisclaimer(), request.onboardingStep());
		profiles.save(profile);
		return ProfileResponse.of(profile, latestBodyMetric(userId));
	}

	/** Đo lại cùng ngày là ghi đè, không tạo dòng thứ hai — UNIQUE (user_id, measured_on). */
	@PostMapping("/body-metrics")
	public ResponseEntity<Void> addBodyMetric(@RequestBody BodyMetricRequest request) {
		UUID userId = currentUser.id();
		LocalDate measuredOn = request.measuredOn() == null ? LocalDate.now() : request.measuredOn();
		BodyMetric metric = bodyMetrics.findByUserIdAndMeasuredOn(userId, measuredOn)
				.orElseGet(() -> new BodyMetric(userId, measuredOn));
		metric.apply(request.heightCm(), request.weightKg());
		bodyMetrics.save(metric);
		return ResponseEntity.noContent().build();
	}

	private BodyMetric latestBodyMetric(UUID userId) {
		List<BodyMetric> all = bodyMetrics.findByUserIdOrderByMeasuredOnDesc(userId);
		return all.isEmpty() ? null : all.get(0);
	}
}
