package com.fitness.content.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.dto.ScheduleResponse;
import com.fitness.program.dto.ScheduledExerciseResponse;
import com.fitness.program.service.ProgramService;
import com.fitness.support.PostgresIntegrationTest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;

/** Hướng dẫn ngắn ở khung chi tiết bài (doc/design-anh-dong-v1.md §3). */
class ExerciseCoachingIntegrationTest extends PostgresIntegrationTest {

	// Liệt kê slug seed thay vì findAll(): test admin khác tạo bài nháp cùng DB.
	private static final List<String> SEEDED = List.of(
			"barbell-back-squat", "romanian-deadlift", "overhead-press", "push-up", "bent-over-row",
			"bodyweight-squat", "reverse-lunge", "glute-bridge", "decline-push-up", "superman", "dead-bug",
			"goblet-squat", "lunge-dumbbell", "dumbbell-floor-press", "one-arm-row", "biceps-curl",
			"lateral-raise", "kettlebell-swing", "barbell-bench-press", "deadlift");

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private ProgramTemplateRepository templates;
	@Autowired
	private ProgramService programService;

	@Test
	void everySeededExerciseHasStepsAndMistakes() {
		for (String slug : SEEDED) {
			Exercise exercise = exercises.findBySlug(slug).orElseThrow();
			assertThat(exercise.getStepsVi()).as(slug).hasSize(3);
			assertThat(exercise.getMistakesVi()).as(slug).hasSize(2);
		}
	}

	@Test
	void scheduleCarriesCoachingForTheGuideSheet() {
		var user = newAuthedUser(Role.USER);
		programService.createProgram(user.userId(), templates.findBySlug("full-body-3x").orElseThrow().getId(),
				Map.of(), Set.of(), LocalDate.now());

		ScheduleResponse schedule = rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(user.headers()), ScheduleResponse.class).getBody();
		ScheduledExerciseResponse squat = schedule.workouts().get(0).exercises().stream()
				.filter(e -> e.exerciseSlug().equals("barbell-back-squat")).findFirst().orElseThrow();

		assertThat(squat.muscleGroups()).startsWith("QUADS");
		assertThat(squat.stepsVi()).hasSize(3);
		assertThat(squat.mistakesVi()).hasSize(2);
	}
}
