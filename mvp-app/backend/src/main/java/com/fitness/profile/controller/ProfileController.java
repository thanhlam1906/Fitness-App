package com.fitness.profile.controller;

import com.fitness.common.CurrentUser;
import com.fitness.profile.dto.BodyMetricRequest;
import com.fitness.profile.dto.BodyMetricResponse;
import com.fitness.profile.dto.ProfilePatchRequest;
import com.fitness.profile.dto.ProfileResponse;
import com.fitness.profile.service.ProfileService;
import jakarta.validation.Valid;
import java.util.List;
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

	private final ProfileService profileService;
	private final CurrentUser currentUser;

	public ProfileController(ProfileService profileService, CurrentUser currentUser) {
		this.profileService = profileService;
		this.currentUser = currentUser;
	}

	@GetMapping("/profile")
	public ProfileResponse get() {
		return profileService.get(currentUser.id());
	}

	@PatchMapping("/profile")
	public ProfileResponse patch(@Valid @RequestBody ProfilePatchRequest request) {
		return profileService.patch(currentUser.id(), request);
	}

	@PostMapping("/body-metrics")
	public ResponseEntity<Void> addBodyMetric(@Valid @RequestBody BodyMetricRequest request) {
		profileService.addBodyMetric(currentUser.id(), request);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/body-metrics")
	public List<BodyMetricResponse> bodyMetrics() {
		return profileService.bodyMetrics(currentUser.id());
	}
}
