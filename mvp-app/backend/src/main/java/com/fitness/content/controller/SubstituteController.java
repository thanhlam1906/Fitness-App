package com.fitness.content.controller;

import com.fitness.common.CurrentUser;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.service.ExerciseService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** §5.5 ke-hoach-chi-tiet-chuc-nang-v1.md — gợi ý bài thay thế khi thiếu thiết bị. */
@RestController
@RequestMapping("/api/v1/exercises/{id}/substitutes")
public class SubstituteController {

	private final ExerciseService exerciseService;
	private final CurrentUser currentUser;

	public SubstituteController(ExerciseService exerciseService, CurrentUser currentUser) {
		this.exerciseService = exerciseService;
		this.currentUser = currentUser;
	}

	@GetMapping
	public List<ExerciseResponse> list(@PathVariable UUID id) {
		return exerciseService.substitutes(currentUser.id(), id);
	}
}
