package com.fitness.content.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.dto.ProgramTemplateAdminResponse;
import com.fitness.content.dto.ProgramTemplateRequest;
import com.fitness.content.dto.ProgramTemplateRequest.ProgressionRequest;
import com.fitness.content.dto.ProgressionPreviewRequest;
import com.fitness.content.dto.ProgressionPreviewResponse;
import com.fitness.content.entity.CycleDay;
import com.fitness.content.entity.CycleExercise;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.ProgramTemplate;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.entity.Program;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.service.progression.ProgressionConfig;
import com.fitness.program.service.progression.ProgressionEngine;
import com.fitness.program.service.progression.ProgressionSignals;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Template chương trình cho admin: thấy và sửa toàn bộ, kể cả template tắt. Khác với
 * {@code ProgramService.findCandidateTemplates} — chỗ đó lọc theo hồ sơ user.
 *
 * Form gửi dạng có cấu trúc; service ghi ra 2 cột jsonb mà ProgramService (sinh lịch) và
 * ProgressionApplicationService (tăng tạ) đang đọc, nên hai chỗ đó không phải đổi.
 */
@Service
public class ProgramTemplateService {

	// Trùng EQUIPMENT_OPTIONS ở web (features/profile/types) — người tập khai đúng 4 loại này.
	private static final Set<String> EQUIPMENT = Set.of("BARBELL_RACK", "DUMBBELL", "KETTLEBELL", "BENCH");
	private static final BigDecimal MAX_INCREMENT_KG = new BigDecimal("20");
	private static final String ACTIVE = "ACTIVE";

	private final ProgramTemplateRepository templates;
	private final ExerciseRepository exercises;
	private final ProgramRepository programs;
	private final ObjectMapper objectMapper;

	public ProgramTemplateService(
			ProgramTemplateRepository templates, ExerciseRepository exercises, ProgramRepository programs,
			ObjectMapper objectMapper) {
		this.templates = templates;
		this.exercises = exercises;
		this.programs = programs;
		this.objectMapper = objectMapper;
	}

	public List<ProgramTemplateAdminResponse> list() {
		// Một query cho cả danh sách thay vì đếm từng template.
		Map<UUID, Long> users = programs.findByStatus(ACTIVE).stream()
				.map(Program::getTemplateId).filter(Objects::nonNull)
				.collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
		return templates.findAll().stream().map(t -> toResponse(t, users.getOrDefault(t.getId(), 0L))).toList();
	}

	public ProgramTemplateAdminResponse get(UUID id) {
		return toResponse(findOrThrow(id), programs.countByTemplateIdAndStatus(id, ACTIVE));
	}

	@Transactional
	public ProgramTemplateAdminResponse create(ProgramTemplateRequest request) {
		Validated v = validate(request);
		ProgramTemplate template = new ProgramTemplate(
				uniqueSlug(request.name()), request.name().trim(), request.methodology(), request.sessionsMin(),
				request.sessionsMax(), request.requiredEquipment().toArray(String[]::new), v.weekStructure, v.progression);
		// Constructor luôn bật; admin có thể tạo sẵn ở trạng thái tắt.
		template.update(template.getName(), template.getMethodology(), template.getSessionsMin(),
				template.getSessionsMax(), template.getRequiredEquipment(), v.weekStructure, v.progression,
				request.active());
		templates.save(template);
		return toResponse(template, 0);
	}

	@Transactional
	public ProgramTemplateAdminResponse update(UUID id, ProgramTemplateRequest request) {
		ProgramTemplate template = findOrThrow(id);
		Validated v = validate(request);
		template.update(
				request.name().trim(), request.methodology(), request.sessionsMin(), request.sessionsMax(),
				request.requiredEquipment().toArray(String[]::new), v.weekStructure, v.progression, request.active());
		templates.save(template);
		return get(id);
	}

	@Transactional
	public ProgramTemplateAdminResponse deactivate(UUID id) {
		ProgramTemplate template = findOrThrow(id);
		template.update(
				template.getName(), template.getMethodology(), template.getSessionsMin(),
				template.getSessionsMax(), template.getRequiredEquipment(), template.getWeekStructure(),
				template.getProgression(), false);
		templates.save(template);
		return get(id);
	}

	@Transactional
	public ProgramTemplateAdminResponse duplicate(UUID id) {
		ProgramTemplate src = findOrThrow(id);
		String name = src.getName() + " (bản sao)";
		ProgramTemplate copy = new ProgramTemplate(
				uniqueSlug(name), name, src.getMethodology(), src.getSessionsMin(), src.getSessionsMax(),
				src.getRequiredEquipment().clone(), src.getWeekStructure(), src.getProgression());
		// Bản sao tắt sẵn: người tập chỉ thấy khi admin sửa xong và bật.
		copy.update(name, copy.getMethodology(), copy.getSessionsMin(), copy.getSessionsMax(),
				copy.getRequiredEquipment(), copy.getWeekStructure(), copy.getProgression(), false);
		templates.save(copy);
		return toResponse(copy, 0);
	}

	/** Không ghi DB: chỉ chạy đúng hàm gộp signal + engine mà buổi tập thật đi qua. */
	public ProgressionPreviewResponse preview(ProgressionPreviewRequest r) {
		if (r.repsMin() > r.repsMax()) {
			throw badRequest("Rep từ lớn hơn rep đến");
		}
		if (r.reps().size() != r.sets()) {
			throw badRequest("Cần nhập rep cho đủ " + r.sets() + " set");
		}
		ProgressionConfig config = toConfig(r.progression());
		BigDecimal increment = config.incrementFor(r.slug());
		if (increment == null) {
			throw badRequest("Bài này không tự tăng tạ nên không có gì để thử");
		}
		var signal = ProgressionSignals.build(
				r.sets(), r.repsMin(), r.repsMax(), r.reps(), r.rpe(), r.pain(), r.painBefore(),
				r.failStreakBefore(), r.rpeLowStreakBefore(), r.loadKg(), increment.doubleValue(), config);
		return ProgressionPreviewResponse.from(new ProgressionEngine(config).decide(signal), r.loadKg());
	}

	static ProgressionConfig toConfig(ProgressionRequest p) {
		// LinkedHashMap giữ giá trị null ("Không tự tăng") và thứ tự admin thấy.
		return new ProgressionConfig(p.targetRpe(), p.rpeLowStreak(), p.rpeOver(), p.minCompletionPct(),
				p.missedSetsToDeload(), p.failStreakToDeload(), p.deloadPct(), new LinkedHashMap<>(p.incrementKg()));
	}

	private record Validated(String weekStructure, String progression) {
	}

	/**
	 * Template hỏng thì người dùng chọn xong sẽ lỗi lúc sinh lịch, hoặc bài có tạ lặng lẽ không bao giờ
	 * tăng. Chặn hết lúc admin lưu.
	 */
	private Validated validate(ProgramTemplateRequest r) {
		if (r.sessionsMin() > r.sessionsMax()) {
			throw badRequest("Số buổi/tuần: số đầu không được lớn hơn số sau");
		}
		List<String> badEquipment = r.requiredEquipment().stream().filter(e -> !EQUIPMENT.contains(e)).toList();
		if (!badEquipment.isEmpty()) {
			throw badRequest("Thiết bị không hợp lệ: " + String.join(", ", badEquipment));
		}

		List<CycleDay> days = new ArrayList<>();
		Set<String> slugs = new LinkedHashSet<>();
		for (int d = 0; d < r.days().size(); d++) {
			ProgramTemplateRequest.DayRequest day = r.days().get(d);
			List<CycleExercise> list = new ArrayList<>();
			for (int i = 0; i < day.exercises().size(); i++) {
				var e = day.exercises().get(i);
				if (e.repsMin() > e.repsMax()) {
					throw badRequest("Buổi " + day.label() + ", bài thứ " + (i + 1) + ": rep từ lớn hơn rep đến");
				}
				list.add(new CycleExercise(e.slug(), e.sets(), e.repsMin(), e.repsMax(), e.restSec()));
				slugs.add(e.slug());
			}
			days.add(new CycleDay(d + 1, day.label().trim(), list));
		}

		Map<String, Exercise> known = exercises.findBySlugIn(List.copyOf(slugs)).stream()
				.collect(Collectors.toMap(Exercise::getSlug, Function.identity()));
		List<String> missing = slugs.stream().filter(s -> !known.containsKey(s)).sorted().toList();
		if (!missing.isEmpty()) {
			throw badRequest("Bài chưa có trong danh sách bài tập: " + String.join(", ", missing));
		}

		// Bài có dụng cụ = cần mức tạ (cùng cách ProgramService tính needsLoad) → phải chọn bước tăng rõ ràng.
		Map<String, BigDecimal> inc = new LinkedHashMap<>();
		for (String slug : slugs) {
			Exercise ex = known.get(slug);
			if (ex.getEquipment().length == 0) {
				continue;
			}
			if (!r.progression().incrementKg().containsKey(slug)) {
				throw badRequest("Chưa chọn bước tăng tạ cho bài: " + nameOf(ex));
			}
			BigDecimal kg = r.progression().incrementKg().get(slug);
			if (kg != null && (kg.signum() <= 0 || kg.compareTo(MAX_INCREMENT_KG) > 0)) {
				throw badRequest("Bước tăng tạ của " + nameOf(ex) + " phải lớn hơn 0 và không quá 20 kg");
			}
			inc.put(slug, kg);
		}

		ProgressionConfig config = toConfig(r.progression());
		ProgressionConfig cleaned = new ProgressionConfig(config.targetRpe(), config.rpeLowStreak(), config.rpeOver(),
				config.minCompletionPct(), config.missedSetsToDeload(), config.failStreakToDeload(), config.deloadPct(),
				inc);
		try {
			return new Validated(objectMapper.writeValueAsString(days), objectMapper.writeValueAsString(cleaned.toJson(objectMapper)));
		} catch (Exception e) {
			throw new IllegalStateException("Không ghi được JSON template", e);
		}
	}

	private String uniqueSlug(String name) {
		String base = TemplateSlugs.fromName(name);
		String slug = base;
		for (int n = 2; templates.findBySlug(slug).isPresent(); n++) {
			slug = base + "-" + n;
		}
		return slug;
	}

	private ProgramTemplateAdminResponse toResponse(ProgramTemplate t, long activeUsers) {
		try {
			List<CycleDay> days = objectMapper.readValue(t.getWeekStructure(), new TypeReference<List<CycleDay>>() {
			});
			ProgressionConfig progression = ProgressionConfig.from(objectMapper.readTree(t.getProgression()));
			return ProgramTemplateAdminResponse.from(t, days, progression, activeUsers);
		} catch (Exception e) {
			throw new IllegalStateException("JSON của template " + t.getSlug() + " hỏng", e);
		}
	}

	private static String nameOf(Exercise ex) {
		return ex.getNameVi() != null ? ex.getNameVi() : ex.getNameEn();
	}

	private static ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private ProgramTemplate findOrThrow(UUID id) {
		return templates.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));
	}
}
