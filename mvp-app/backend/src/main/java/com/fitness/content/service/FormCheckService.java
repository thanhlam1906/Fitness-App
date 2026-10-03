package com.fitness.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.FormCheckRequest;
import com.fitness.content.dto.FormCheckResponse;
import com.fitness.content.entity.FormCheck;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.FormCheckRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Mỗi bài 2–3 check, admin/HLV sửa ngưỡng không cần deploy (P7). Tắt check là soft delete. */
@Service
public class FormCheckService {

	private final FormCheckRepository formChecks;
	private final ExerciseRepository exercises;
	private final ObjectMapper objectMapper;

	public FormCheckService(FormCheckRepository formChecks, ExerciseRepository exercises, ObjectMapper objectMapper) {
		this.formChecks = formChecks;
		this.exercises = exercises;
		this.objectMapper = objectMapper;
	}

	public List<FormCheckResponse> list(UUID exerciseId) {
		return formChecks.findByExerciseId(exerciseId).stream().map(FormCheckResponse::from).toList();
	}

	public FormCheckResponse create(UUID exerciseId, FormCheckRequest request) {
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

	public FormCheckResponse update(UUID exerciseId, UUID id, FormCheckRequest request) {
		FormCheck check = findOrThrow(exerciseId, id);
		JsonText.requireValid(objectMapper, "thresholds", request.thresholds());
		check.update(
				request.metric(), toArray(request.validViewpoints()), request.thresholds(),
				request.confidenceMin(), request.cuePassVi(), request.cueWarnVi(), request.cueFailVi(),
				request.priority(), request.active());
		formChecks.save(check);
		return FormCheckResponse.from(check);
	}

	public FormCheckResponse deactivate(UUID exerciseId, UUID id) {
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
