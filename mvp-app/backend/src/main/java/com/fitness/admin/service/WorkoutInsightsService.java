package com.fitness.admin.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.admin.dto.WorkoutInsightsResponse;
import com.fitness.admin.service.insights.WorkoutInsights;
import com.fitness.admin.service.insights.WorkoutInsights.DecisionRow;
import com.fitness.admin.service.insights.WorkoutInsights.PainRow;
import com.fitness.admin.service.insights.WorkoutInsights.ScheduledRow;
import com.fitness.admin.service.insights.WorkoutInsights.SetRow;
import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.ProgramTemplate;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.service.progression.ProgressionConfig;
import com.fitness.workout.repository.PainReportRepository;
import com.fitness.workout.repository.SetLogRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md). Chỉ đọc bảng của workout, program,
 * content; không ghi gì. Lọc template làm trong WorkoutInsights để truy vấn khỏi phải nhận tham số
 * UUID có thể null.
 */
@Service
public class WorkoutInsightsService {

	private static final Set<Integer> DAYS = Set.of(7, 30, 90);

	private final SetLogRepository setLogs;
	private final PainReportRepository painReports;
	private final ScheduledExerciseRepository scheduledExercises;
	private final LoadDecisionRepository loadDecisions;
	private final ProgramTemplateRepository templates;
	private final ExerciseRepository exercises;
	private final ObjectMapper objectMapper;

	public WorkoutInsightsService(
			SetLogRepository setLogs, PainReportRepository painReports,
			ScheduledExerciseRepository scheduledExercises, LoadDecisionRepository loadDecisions,
			ProgramTemplateRepository templates, ExerciseRepository exercises, ObjectMapper objectMapper) {
		this.setLogs = setLogs;
		this.painReports = painReports;
		this.scheduledExercises = scheduledExercises;
		this.loadDecisions = loadDecisions;
		this.templates = templates;
		this.exercises = exercises;
		this.objectMapper = objectMapper;
	}

	public WorkoutInsightsResponse get(UUID templateId, int days) {
		if (!DAYS.contains(days)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày");
		}
		List<ProgramTemplate> all = templates.findAll();
		if (templateId != null && all.stream().noneMatch(t -> t.getId().equals(templateId))) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template");
		}
		Map<UUID, ProgressionConfig> configs = new HashMap<>();
		Map<UUID, String> templateNames = new HashMap<>();
		for (ProgramTemplate t : all) {
			configs.put(t.getId(), ProgressionConfig.from(readJson(t.getProgression())));
			templateNames.put(t.getId(), t.getName());
		}
		Map<UUID, String> exerciseNames = new HashMap<>();
		for (Exercise e : exercises.findAll()) {
			exerciseNames.put(e.getId(), e.getNameVi() != null ? e.getNameVi() : e.getNameEn());
		}

		Instant from = Instant.now().minus(days, ChronoUnit.DAYS);
		LocalDate today = LocalDate.now();
		return WorkoutInsights.compute(
				days, templateId,
				setLogs.insightRowsSince(from).stream().map(WorkoutInsightsService::toSetRow).toList(),
				scheduledExercises.insightRowsBetween(today.minusDays(days), today).stream()
						.map(r -> new ScheduledRow((UUID) r[0], (UUID) r[1], (UUID) r[2], (UUID) r[3]))
						.toList(),
				toPainRows(painReports.insightRowsSince(from)),
				loadDecisions.insightRowsSince(from).stream()
						.map(r -> new DecisionRow((UUID) r[0], (UUID) r[1], (String) r[2], (String) r[3]))
						.toList(),
				configs, exerciseNames, templateNames);
	}

	private static SetRow toSetRow(Object[] r) {
		return new SetRow((UUID) r[0], (UUID) r[1], (UUID) r[2], (Boolean) r[3], (String) r[4],
				toInt(r[5]), toInt(r[6]), toInt(r[7]));
	}

	/** Cột smallint về Short, min() có thể về Short hoặc Integer tuỳ Hibernate: đi qua Number. */
	private static Integer toInt(Object value) {
		return value == null ? null : ((Number) value).intValue();
	}

	/** Truy vấn trả một dòng cho mỗi (lần báo đau, set): gộp về một PainRow mỗi lần báo. */
	private static List<PainRow> toPainRows(List<Object[]> rows) {
		Map<UUID, PainRow> byReport = new LinkedHashMap<>();
		for (Object[] r : rows) {
			PainRow pain = byReport.computeIfAbsent((UUID) r[0], id -> new PainRow(
					(UUID) r[1], (UUID) r[2], (String) r[3], ((Number) r[4]).intValue(), new HashSet<>()));
			if (r[5] != null) {
				pain.exerciseIds().add((UUID) r[5]);
			}
		}
		return List.copyOf(byReport.values());
	}

	private JsonNode readJson(String json) {
		try {
			return objectMapper.readTree(json);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Cột progression của template không phải JSON", e);
		}
	}
}
