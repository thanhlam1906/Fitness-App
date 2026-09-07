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

/** Màn 12 concept-frontend-v1.md — mỗi bài 2–3 check, admin/HLV sửa ngưỡng không cần deploy (P7). */
@RestController
@RequestMapping("/api/v1/exercises/{exerciseId}/form-checks")
public class FormCheckController {

	private final FormCheckRepository formChecks;
	private final ExerciseRepository exercises;
	private final ObjectMapper objectMapper;

	public FormCheckController(
			FormCheckRepository formChecks, ExerciseRepository exercises, ObjectMapper objectMapper) {
		this.formChecks = formChecks;
		this.exercises = exercises;
		this.objectMapper = objectMapper;
	}

	@GetMapping
	public List<FormCheckResponse> list(@PathVariable UUID exerciseId) {
		return formChecks.findByExerciseId(exerciseId).stream().map(FormCheckResponse::from).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FormCheckResponse create(@PathVariable UUID exerciseId, @Valid @RequestBody FormCheckRequest request) {
		if (!exercises.existsById(exerciseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập");
		}
		if (request.code() == null || request.code().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "code bắt buộc khi tạo mới");
		}
		if (formChecks.findByExerciseIdAndCode(exerciseId, request.code()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "code đã tồn tại cho bài này");
		}
		JsonText.requireValid(objectMapper, "thresholds", request.thresholds());

		FormCheck check = new FormCheck(
				exerciseId, request.code(), request.metric(), toArray(request.validViewpoints()),
				request.thresholds(), request.confidenceMin(), request.cuePassVi(), request.cueWarnVi(),
				request.cueFailVi(), request.priority());
		formChecks.save(check);
		return FormCheckResponse.from(check);
	}

	@PutMapping("/{id}")
	public FormCheckResponse update(
			@PathVariable UUID exerciseId, @PathVariable UUID id, @Valid @RequestBody FormCheckRequest request) {
		FormCheck check = findOrThrow(exerciseId, id);
		JsonText.requireValid(objectMapper, "thresholds", request.thresholds());
		check.update(
				request.metric(), toArray(request.validViewpoints()), request.thresholds(),
				request.confidenceMin(), request.cuePassVi(), request.cueWarnVi(), request.cueFailVi(),
				request.priority(), request.active());
		formChecks.save(check);
		return FormCheckResponse.from(check);
	}

	@DeleteMapping("/{id}")
	public FormCheckResponse deactivate(@PathVariable UUID exerciseId, @PathVariable UUID id) {
		FormCheck check = findOrThrow(exerciseId, id);
		check.update(
				check.getMetric(), check.getValidViewpoints(), check.getThresholds(), check.getConfidenceMin(),
				check.getCuePassVi(), check.getCueWarnVi(), check.getCueFailVi(), check.getPriority(), false);
		formChecks.save(check);
		return FormCheckResponse.from(check);
	}

	private FormCheck findOrThrow(UUID exerciseId, UUID id) {
		FormCheck check = formChecks.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy check"));
		if (!check.getExerciseId().equals(exerciseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Check không thuộc bài tập này");
		}
		return check;
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
