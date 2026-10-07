package com.fitness.content.controller;

import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.service.ExerciseService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Màn 12 concept-frontend-v1.md — CRUD ~40 bài. Đọc mở cho mọi user, sửa chỉ admin. */
@RestController
@RequestMapping("/api/v1/exercises")
public class ExerciseController {

	private final ExerciseService exerciseService;

	public ExerciseController(ExerciseService exerciseService) {
		this.exerciseService = exerciseService;
	}

	@GetMapping
	public List<ExerciseResponse> list() {
		return exerciseService.list();
	}

	@GetMapping("/{id}")
	public ExerciseResponse get(@PathVariable UUID id) {
		return exerciseService.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse create(@Valid @RequestBody ExerciseRequest request) {
		return exerciseService.create(request);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody ExerciseRequest request) {
		return exerciseService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('ADMIN')")
	public ExerciseResponse deactivate(@PathVariable UUID id) {
		return exerciseService.deactivate(id);
	}
}
