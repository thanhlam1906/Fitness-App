package com.fitness.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * CRUD template cho admin (màn 12 concept-frontend-v1.md). Khác với
 * {@code GET /programs/candidates} ở ProgramController — endpoint đó lọc
 * theo hồ sơ user, còn ở đây admin thấy và sửa toàn bộ, kể cả template tắt.
 */
@RestController
@RequestMapping("/api/v1/program-templates")
public class ProgramTemplateAdminController {

	private final ProgramTemplateRepository templates;
	private final ObjectMapper objectMapper;

	public ProgramTemplateAdminController(ProgramTemplateRepository templates, ObjectMapper objectMapper) {
		this.templates = templates;
		this.objectMapper = objectMapper;
	}

	@GetMapping
	public List<ProgramTemplateAdminResponse> list() {
		return templates.findAll().stream().map(ProgramTemplateAdminResponse::from).toList();
	}

	@GetMapping("/{id}")
	public ProgramTemplateAdminResponse get(@PathVariable UUID id) {
		return ProgramTemplateAdminResponse.from(findOrThrow(id));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ProgramTemplateAdminResponse create(@Valid @RequestBody ProgramTemplateRequest request) {
		if (request.slug() == null || request.slug().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug bắt buộc khi tạo mới");
		}
		if (templates.findBySlug(request.slug()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "slug đã tồn tại");
		}
		JsonText.requireValid(objectMapper, "weekStructure", request.weekStructure());
		JsonText.requireValid(objectMapper, "progression", request.progression());

		ProgramTemplate template = new ProgramTemplate(
				request.slug(), request.name(), request.methodology(), request.sessionsMin(),
				request.sessionsMax(), toArray(request.requiredEquipment()), request.weekStructure(),
				request.progression());
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	@PutMapping("/{id}")
	public ProgramTemplateAdminResponse update(
			@PathVariable UUID id, @Valid @RequestBody ProgramTemplateRequest request) {
		ProgramTemplate template = findOrThrow(id);
		JsonText.requireValid(objectMapper, "weekStructure", request.weekStructure());
		JsonText.requireValid(objectMapper, "progression", request.progression());
		template.update(
				request.name(), request.methodology(), request.sessionsMin(), request.sessionsMax(),
				toArray(request.requiredEquipment()), request.weekStructure(), request.progression(),
				request.active());
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	@DeleteMapping("/{id}")
	public ProgramTemplateAdminResponse deactivate(@PathVariable UUID id) {
		ProgramTemplate template = findOrThrow(id);
		template.update(
				template.getName(), template.getMethodology(), template.getSessionsMin(),
				template.getSessionsMax(), template.getRequiredEquipment(), template.getWeekStructure(),
				template.getProgression(), false);
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	private ProgramTemplate findOrThrow(UUID id) {
		return templates.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
