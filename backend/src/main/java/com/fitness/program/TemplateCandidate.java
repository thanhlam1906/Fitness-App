package com.fitness.program;

import java.util.UUID;

public record TemplateCandidate(UUID id, String slug, String name, String methodology) {

	static TemplateCandidate from(com.fitness.content.ProgramTemplate template) {
		return new TemplateCandidate(template.getId(), template.getSlug(), template.getName(), template.getMethodology());
	}
}
