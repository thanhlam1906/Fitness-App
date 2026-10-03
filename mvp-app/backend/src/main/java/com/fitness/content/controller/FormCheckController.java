package com.fitness.content.controller;

import com.fitness.content.dto.FormCheckRequest;
import com.fitness.content.dto.FormCheckResponse;
import com.fitness.content.service.FormCheckService;
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

/**
 * Màn 12 concept-frontend-v1.md. Toàn bộ controller admin-only, kể cả GET — người dùng thường không
 * đọc thẳng ngưỡng qua API này, analyzer đọc thẳng từ DB (concept-backend-v1.md §1: "Analyzer đọc
 * form_checks trực tiếp từ Postgres").
 */
@RestController
@RequestMapping("/api/v1/exercises/{exerciseId}/form-checks")
@PreAuthorize("hasRole('ADMIN')")
public class FormCheckController {

	private final FormCheckService formCheckService;

	public FormCheckController(FormCheckService formCheckService) {
		this.formCheckService = formCheckService;
	}

	@GetMapping
	public List<FormCheckResponse> list(@PathVariable UUID exerciseId) {
		return formCheckService.list(exerciseId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FormCheckResponse create(@PathVariable UUID exerciseId, @Valid @RequestBody FormCheckRequest request) {
		return formCheckService.create(exerciseId, request);
	}

	@PutMapping("/{id}")
	public FormCheckResponse update(
			@PathVariable UUID exerciseId, @PathVariable UUID id, @Valid @RequestBody FormCheckRequest request) {
		return formCheckService.update(exerciseId, id, request);
	}

	@DeleteMapping("/{id}")
	public FormCheckResponse deactivate(@PathVariable UUID exerciseId, @PathVariable UUID id) {
		return formCheckService.deactivate(exerciseId, id);
	}
}
