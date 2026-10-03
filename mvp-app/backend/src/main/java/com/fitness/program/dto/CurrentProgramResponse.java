package com.fitness.program.dto;

import com.fitness.content.entity.ProgramTemplate;
import com.fitness.program.entity.Program;
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
		String params,
		Short sessionsMin,
		Short sessionsMax) {

	public static CurrentProgramResponse of(Program program, ProgramTemplate template) {
		return new CurrentProgramResponse(
				program.getId(), program.getTemplateId(), template.getSlug(), template.getName(),
				template.getMethodology(), program.getStartDate(),
				Arrays.asList(program.getRestDays()), program.getParams(),
				template.getSessionsMin(), template.getSessionsMax());
	}

	/** Lịch tự thiết kế không có template — vẫn phải hiện được tên ở màn Hồ sơ. */
	public static CurrentProgramResponse ofCustom(Program program) {
		return new CurrentProgramResponse(
				program.getId(), null, null, "Lịch tự thiết kế", null, program.getStartDate(),
				Arrays.asList(program.getRestDays()), program.getParams(), null, null);
	}
}
