package com.fitness.program;

import com.fitness.content.ProgramTemplate;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/** Màn 10 concept-frontend-v1.md — hồ sơ và cài đặt hiển thị chương trình đang chạy. */
public record CurrentProgramResponse(
		UUID id,
		UUID templateId,
		String templateSlug,
		String templateName,
		String methodology,
		LocalDate startDate,
		List<Short> restDays,
		String params) {

	static CurrentProgramResponse of(Program program, ProgramTemplate template) {
		return new CurrentProgramResponse(
				program.getId(), program.getTemplateId(), template.getSlug(), template.getName(),
				template.getMethodology(), program.getStartDate(),
				Arrays.asList(program.getRestDays()), program.getParams());
	}
}
