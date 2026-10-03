package com.fitness.content.controller;

import com.fitness.content.dto.ProgramTemplateAdminResponse;
import com.fitness.content.dto.ProgramTemplateRequest;
import com.fitness.content.service.ProgramTemplateService;
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
 * CRUD template cho admin (màn 12 concept-frontend-v1.md), admin-only kể cả GET. Khác với
 * {@code GET /programs/candidates} ở ProgramController — endpoint đó lọc theo hồ sơ user và mở cho
 * mọi user.
 */
@RestController
@RequestMapping("/api/v1/program-templates")
@PreAuthorize("hasRole('ADMIN')")
public class ProgramTemplateAdminController {

	private final ProgramTemplateService templateService;

	public ProgramTemplateAdminController(ProgramTemplateService templateService) {
		this.templateService = templateService;
	}

	@GetMapping
	public List<ProgramTemplateAdminResponse> list() {
		return templateService.list();
	}

	@GetMapping("/{id}")
	public ProgramTemplateAdminResponse get(@PathVariable UUID id) {
		return templateService.get(id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ProgramTemplateAdminResponse create(@Valid @RequestBody ProgramTemplateRequest request) {
		return templateService.create(request);
	}

	@PutMapping("/{id}")
	public ProgramTemplateAdminResponse update(
			@PathVariable UUID id, @Valid @RequestBody ProgramTemplateRequest request) {
		return templateService.update(id, request);
	}

	@DeleteMapping("/{id}")
	public ProgramTemplateAdminResponse deactivate(@PathVariable UUID id) {
		return templateService.deactivate(id);
	}
}
