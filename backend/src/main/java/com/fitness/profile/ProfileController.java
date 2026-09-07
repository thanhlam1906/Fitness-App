package com.fitness.profile;

import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** concept-backend-v1.md §6: "/me/*" — userId luôn từ JWT, không bao giờ từ URL/body. */
@RestController
@RequestMapping("/api/v1/me/profile")
public class ProfileController {

	private final ProfileRepository profileRepository;
	private final CurrentUser currentUser;

	public ProfileController(ProfileRepository profileRepository, CurrentUser currentUser) {
		this.profileRepository = profileRepository;
		this.currentUser = currentUser;
	}

	@PutMapping
	public ResponseEntity<Void> saveOnboarding(@Valid @RequestBody OnboardingRequest request) {
		var userId = currentUser.id();
		Profile profile = profileRepository.findById(userId).orElseGet(() -> new Profile(userId));
		profile.applyOnboarding(request.goal(), request.experience(), request.sessionsPerWeek(),
				request.equipment().toArray(new String[0]));
		profileRepository.save(profile);
		return ResponseEntity.noContent().build();
	}
}
