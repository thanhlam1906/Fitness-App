package com.fitness.content.dto;

import com.fitness.content.entity.CycleDay;
import com.fitness.content.entity.ProgramTemplate;
import com.fitness.program.service.progression.ProgressionConfig;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** activeUsers: số chương trình ACTIVE gắn template — admin cần biết trước khi sửa quy tắc (áp ngay cho họ). */
public record ProgramTemplateAdminResponse(
		UUID id,
		String slug,
		String name,
		String methodology,
		short sessionsMin,
		short sessionsMax,
		List<String> requiredEquipment,
		boolean active,
		List<DayResponse> days,
		ProgressionResponse progression,
		long activeUsers) {

	public record DayResponse(String label, List<TemplateExerciseResponse> exercises) {
	}

	public record TemplateExerciseResponse(String slug, int sets, int repsMin, int repsMax, int restSec) {
	}

	public record ProgressionResponse(
			double targetRpe, int rpeLowStreak, double rpeOver, double minCompletionPct,
			int missedSetsToDeload, int failStreakToDeload, double deloadPct, Map<String, BigDecimal> incrementKg) {
	}

	public static ProgramTemplateAdminResponse from(
			ProgramTemplate t, List<CycleDay> days, ProgressionConfig p, long activeUsers) {
		return new ProgramTemplateAdminResponse(
				t.getId(), t.getSlug(), t.getName(), t.getMethodology(), t.getSessionsMin(), t.getSessionsMax(),
				List.of(t.getRequiredEquipment()), t.isActive(),
				days.stream().map(d -> new DayResponse(d.label(), d.exercises().stream()
						.map(e -> new TemplateExerciseResponse(e.exerciseSlug(), e.sets(), e.repsMin(), e.repsMax(), e.restSec()))
						.toList())).toList(),
				new ProgressionResponse(p.targetRpe(), p.rpeLowStreak(), p.rpeOver(), p.minCompletionPct(),
						p.missedSetsToDeload(), p.failStreakToDeload(), p.deloadPct(), p.incrementKg()),
				activeUsers);
	}
}
