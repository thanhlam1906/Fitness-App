package com.fitness.program;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Một bài trong một CycleDay, đọc từ week_structure.exercises[]. Tên field
 * JSON trong program_templates.week_structure không khớp tên record 1-1
 * (vd "slug" thay vì "exercise_slug") — @JsonProperty map đúng khi
 * ProgramService parse JSON, không đổi tên record đang có unit test.
 */
public record CycleExercise(
		@JsonProperty("slug") String exerciseSlug,
		int sets,
		@JsonProperty("reps_min") int repsMin,
		@JsonProperty("reps_max") int repsMax,
		@JsonProperty("rest_sec") int restSec) {
}
