package com.fitness.profile;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profiles")
public class ProfileController {

	private final ProfileRepository profileRepository;

	public ProfileController(ProfileRepository profileRepository) {
		this.profileRepository = profileRepository;
	}

	@PutMapping("/{userId}")
	public ResponseEntity<Void> saveOnboarding(@PathVariable UUID userId, @Valid @RequestBody OnboardingRequest request) {
		Profile profile = profileRepository.findById(userId).orElseGet(() -> new Profile(userId));
		profile.applyOnboarding(request.goal(), request.experience(), request.sessionsPerWeek(),
				request.equipment().toArray(new String[0]));
		profileRepository.save(profile);
		return ResponseEntity.noContent().build();
	}
}
