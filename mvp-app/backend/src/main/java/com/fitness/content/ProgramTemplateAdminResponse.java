package com.fitness.content;

import java.util.List;
import java.util.UUID;

public record ProgramTemplateAdminResponse(
		UUID id,
		String slug,
		String name,
		String methodology,
		short sessionsMin,
		short sessionsMax,
		List<String> requiredEquipment,
		String weekStructure,
		String progression,
		boolean active) {

	static ProgramTemplateAdminResponse from(ProgramTemplate t) {
		return new ProgramTemplateAdminResponse(
				t.getId(), t.getSlug(), t.getName(), t.getMethodology(), t.getSessionsMin(), t.getSessionsMax(),
				List.of(t.getRequiredEquipment()), t.getWeekStructure(), t.getProgression(), t.isActive());
	}
}
