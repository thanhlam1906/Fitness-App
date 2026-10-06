package com.fitness.admin.controller;

import com.fitness.admin.dto.WorkoutInsightsResponse;
import com.fitness.admin.service.WorkoutInsightsService;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md). Chỉ đọc. */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminWorkoutInsightsController {

	private final WorkoutInsightsService workoutInsightsService;

	public AdminWorkoutInsightsController(WorkoutInsightsService workoutInsightsService) {
		this.workoutInsightsService = workoutInsightsService;
	}

	@GetMapping("/workout-insights")
	public WorkoutInsightsResponse get(
			@RequestParam(required = false) UUID templateId,
			@RequestParam(defaultValue = "30") int days) {
		return workoutInsightsService.get(templateId, days);
	}
}
