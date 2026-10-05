package com.fitness.content.dto;

import com.fitness.content.entity.FormCheck;
import java.util.UUID;

public record FormCheckResponse(
		UUID id,
		UUID exerciseId,
		String view,
		String measure,
		String moment,
		Integer from,
		Integer to,
		int warn,
		String nameVi,
		String cueFailVi,
		short priority) {

	/** Ngưỡng nằm trong cột jsonb dạng chữ; service đọc ra rồi truyền vào đây. */
	public static FormCheckResponse from(FormCheck f, Integer from, Integer to, int warn) {
		return new FormCheckResponse(
				f.getId(), f.getExerciseId(), f.getView(), f.getMetric(), f.getMoment(),
				from, to, warn, f.getNameVi(), f.getCueFailVi(), f.getPriority());
	}
}
