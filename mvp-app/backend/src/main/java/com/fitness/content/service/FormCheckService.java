package com.fitness.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.FormCheckRequest;
import com.fitness.content.dto.FormCheckResponse;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.FormCheck;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.FormCheckRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Khớp cần kiểm của bài (doc/design-cham-form-nguong-v1.md §7). Admin chọn góc, khớp, lúc đo,
 * ngưỡng; mã mục máy tự sinh. Xoá là tắt mềm vì review_results cũ còn trỏ tới. Mỗi lần đổi thì
 * tính lại exercises.analyzable: bài chấm được khi còn ít nhất một khớp đang bật.
 */
@Service
public class FormCheckService {

	private static final Set<String> MOMENTS = Set.of("START", "PEAK");

	private final FormCheckRepository formChecks;
	private final ExerciseRepository exercises;
	private final ObjectMapper objectMapper;

	public FormCheckService(FormCheckRepository formChecks, ExerciseRepository exercises, ObjectMapper objectMapper) {
		this.formChecks = formChecks;
		this.exercises = exercises;
		this.objectMapper = objectMapper;
	}

	public List<FormCheckResponse> list(UUID exerciseId) {
		return formChecks.findByExerciseIdAndActiveTrueOrderByPriority(exerciseId).stream()
				.map(this::toResponse).toList();
	}

	@Transactional
	public FormCheckResponse create(UUID exerciseId, FormCheckRequest request) {
		Exercise exercise = findExercise(exerciseId);
		validate(request);
		short next = (short) (formChecks.findByExerciseIdAndActiveTrueOrderByPriority(exerciseId).stream()
				.mapToInt(FormCheck::getPriority).max().orElse(0) + 1);
		FormCheck saved = upsert(exerciseId, request, next);
		refreshAnalyzable(exercise);
		return toResponse(saved);
	}

	@Transactional
	public FormCheckResponse update(UUID exerciseId, UUID id, FormCheckRequest request) {
		Exercise exercise = findExercise(exerciseId);
		validate(request);
		FormCheck current = findOrThrow(exerciseId, id);
		FormCheck saved;
		if (codeOf(request).equals(current.getCode())) {
			current.update(thresholdsOf(request), request.nameVi().trim(), request.cueFailVi().trim(),
					current.getPriority());
			saved = formChecks.save(current);
		} else {
			// Đổi góc, khớp hay lúc đo là đổi sang khớp khác: tắt dòng cũ, giữ thứ tự ưu tiên.
			current.deactivate();
			formChecks.save(current);
			saved = upsert(exerciseId, request, current.getPriority());
		}
		refreshAnalyzable(exercise);
		return toResponse(saved);
	}

	@Transactional
	public FormCheckResponse deactivate(UUID exerciseId, UUID id) {
		Exercise exercise = findExercise(exerciseId);
		FormCheck check = findOrThrow(exerciseId, id);
		check.deactivate();
		formChecks.save(check);
		refreshAnalyzable(exercise);
		return toResponse(check);
	}

	/** Tạo mới, hoặc bật lại dòng đã tắt cùng mã: UNIQUE (exercise_id, code) không cho dòng thứ hai. */
	private FormCheck upsert(UUID exerciseId, FormCheckRequest r, short priority) {
		String code = codeOf(r);
		Optional<FormCheck> existing = formChecks.findByExerciseIdAndCode(exerciseId, code);
		if (existing.isPresent() && existing.get().isActive()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Khớp này đã có ở góc này");
		}
		FormCheck check = existing.orElseGet(() -> new FormCheck(exerciseId, code, r.measure(), r.view(), r.moment()));
		check.update(thresholdsOf(r), r.nameVi().trim(), r.cueFailVi().trim(), priority);
		return formChecks.save(check);
	}

	private void refreshAnalyzable(Exercise exercise) {
		exercise.markAnalyzable(!formChecks.findByExerciseIdAndActiveTrueOrderByPriority(exercise.getId()).isEmpty());
		exercises.save(exercise);
	}

	private static void validate(FormCheckRequest r) {
		FormMeasures.Measure m = FormMeasures.MEASURES.get(r.measure());
		if (m == null) {
			throw bad("Không có số đo " + r.measure());
		}
		if (!m.views().contains(r.view())) {
			throw bad("Số đo này không đo đúng được ở góc đã chọn");
		}
		if (!MOMENTS.contains(r.moment())) {
			throw bad("Lúc đo phải là START hoặc PEAK");
		}
		if (r.from() == null && r.to() == null) {
			throw bad("Cần ít nhất một trong hai số: từ, đến");
		}
		if (outside(r.from(), m.max()) || outside(r.to(), m.max())) {
			throw bad("Số phải từ 0 đến " + m.max());
		}
		if (r.from() != null && r.to() != null && r.from() >= r.to()) {
			throw bad("Số đầu phải nhỏ hơn số sau");
		}
	}

	private static boolean outside(Integer value, int max) {
		return value != null && (value < 0 || value > max);
	}

	private static ResponseStatusException bad(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private static String codeOf(FormCheckRequest r) {
		return r.view() + "-" + r.measure() + "-" + r.moment();
	}

	/** null in ra "null", đúng JSON. */
	private static String thresholdsOf(FormCheckRequest r) {
		return "{\"from\": %s, \"to\": %s, \"warn\": %d}".formatted(r.from(), r.to(), r.warn());
	}

	private FormCheckResponse toResponse(FormCheck f) {
		try {
			JsonNode t = objectMapper.readTree(f.getThresholds());
			return FormCheckResponse.from(f, intOrNull(t.get("from")), intOrNull(t.get("to")), t.path("warn").asInt(0));
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("thresholds hỏng ở form_check " + f.getId(), e);
		}
	}

	private static Integer intOrNull(JsonNode node) {
		return node == null || node.isNull() ? null : node.asInt();
	}

	private Exercise findExercise(UUID exerciseId) {
		return exercises.findById(exerciseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	private FormCheck findOrThrow(UUID exerciseId, UUID id) {
		FormCheck check = formChecks.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khớp cần kiểm"));
		if (!check.getExerciseId().equals(exerciseId)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Khớp cần kiểm không thuộc bài tập này");
		}
		return check;
	}
}
