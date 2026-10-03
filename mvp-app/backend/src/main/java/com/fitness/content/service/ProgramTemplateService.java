package com.fitness.content.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.ProgramTemplateAdminResponse;
import com.fitness.content.dto.ProgramTemplateRequest;
import com.fitness.content.entity.CycleDay;
import com.fitness.content.entity.CycleExercise;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.ProgramTemplate;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Template chương trình cho admin: thấy và sửa toàn bộ, kể cả template tắt. Khác với
 * {@code ProgramService.findCandidateTemplates} — chỗ đó lọc theo hồ sơ user.
 */
@Service
public class ProgramTemplateService {

	private final ProgramTemplateRepository templates;
	private final ExerciseRepository exercises;
	private final ObjectMapper objectMapper;

	public ProgramTemplateService(
			ProgramTemplateRepository templates, ExerciseRepository exercises, ObjectMapper objectMapper) {
		this.templates = templates;
		this.exercises = exercises;
		this.objectMapper = objectMapper;
	}

	public List<ProgramTemplateAdminResponse> list() {
		return templates.findAll().stream().map(ProgramTemplateAdminResponse::from).toList();
	}

	public ProgramTemplateAdminResponse get(UUID id) {
		return ProgramTemplateAdminResponse.from(findOrThrow(id));
	}

	public ProgramTemplateAdminResponse create(ProgramTemplateRequest request) {
		if (request.slug() == null || request.slug().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug bắt buộc khi tạo mới");
		}
		if (templates.findBySlug(request.slug()).isPresent()) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "slug đã tồn tại");
		}
		requireUsableWeekStructure(request.weekStructure());
		JsonText.requireValid(objectMapper, "progression", request.progression());

		ProgramTemplate template = new ProgramTemplate(
				request.slug(), request.name(), request.methodology(), request.sessionsMin(),
				request.sessionsMax(), toArray(request.requiredEquipment()), request.weekStructure(),
				request.progression());
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	public ProgramTemplateAdminResponse update(UUID id, ProgramTemplateRequest request) {
		ProgramTemplate template = findOrThrow(id);
		requireUsableWeekStructure(request.weekStructure());
		JsonText.requireValid(objectMapper, "progression", request.progression());
		template.update(
				request.name(), request.methodology(), request.sessionsMin(), request.sessionsMax(),
				toArray(request.requiredEquipment()), request.weekStructure(), request.progression(),
				request.active());
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	public ProgramTemplateAdminResponse deactivate(UUID id) {
		ProgramTemplate template = findOrThrow(id);
		template.update(
				template.getName(), template.getMethodology(), template.getSessionsMin(),
				template.getSessionsMax(), template.getRequiredEquipment(), template.getWeekStructure(),
				template.getProgression(), false);
		templates.save(template);
		return ProgramTemplateAdminResponse.from(template);
	}

	/**
	 * Template không có buổi, có buổi không bài, hoặc gọi bài chưa có trong bảng exercises
	 * thì người dùng chọn xong sẽ lỗi 500 lúc sinh lịch. Chặn ngay lúc admin lưu.
	 */
	private void requireUsableWeekStructure(String json) {
		List<CycleDay> days;
		try {
			days = objectMapper.readValue(json, new TypeReference<List<CycleDay>>() {
			});
		} catch (Exception e) {
			throw badRequest("weekStructure không đúng định dạng JSON của lịch tập");
		}
		// JSON "null", buổi null, bài thiếu slug đều qua được readValue nên phải chặn tay.
		if (days == null || days.isEmpty()) {
			throw badRequest("weekStructure cần ít nhất một buổi");
		}
		for (CycleDay day : days) {
			if (day == null || day.exercises() == null || day.exercises().isEmpty()) {
				throw badRequest("Có buổi chưa có bài nào");
			}
			for (CycleExercise exercise : day.exercises()) {
				if (exercise == null || exercise.exerciseSlug() == null || exercise.exerciseSlug().isBlank()) {
					throw badRequest("Buổi " + day.label() + " có bài thiếu slug");
				}
			}
		}
		Set<String> slugs = days.stream().flatMap(d -> d.exercises().stream())
				.map(CycleExercise::exerciseSlug).collect(Collectors.toSet());
		Set<String> known = exercises.findBySlugIn(List.copyOf(slugs)).stream()
				.map(Exercise::getSlug).collect(Collectors.toSet());
		List<String> missing = slugs.stream().filter(slug -> !known.contains(slug)).sorted().toList();
		if (!missing.isEmpty()) {
			throw badRequest("Bài chưa có trong danh sách bài tập: " + String.join(", ", missing));
		}
	}

	private static ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private ProgramTemplate findOrThrow(UUID id) {
		return templates.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));
	}

	private static String[] toArray(List<String> values) {
		return values == null ? new String[0] : values.toArray(new String[0]);
	}
}
