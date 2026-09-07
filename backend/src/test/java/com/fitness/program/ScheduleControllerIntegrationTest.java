package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.user.Role;
import com.fitness.user.User;
import com.fitness.user.UserRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;

class ScheduleControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private ProgramTemplateRepository templateRepository;
	@Autowired
	private ProgramService programService;

	private static final LocalDate A_MONDAY =
			LocalDate.of(2026, 9, 7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

	@Test
	void getSchedule_returnsWorkoutsWithResolvedExerciseNames() {
		UUID userId = userRepository.save(new User("sched+" + UUID.randomUUID() + "@example.com", "x", Role.USER)).getId();
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x")).findFirst().orElseThrow();
		programService.createProgram(
				userId, template.getId(), Map.of("barbell-back-squat", 60.0),
				Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);

		var response = rest.getForEntity("/api/v1/schedule?userId=" + userId, ScheduleResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody().workouts()).hasSize(20);
		var firstDay = response.getBody().workouts().get(0);
		assertThat(firstDay.scheduledOn()).isEqualTo(A_MONDAY);
		assertThat(firstDay.exercises()).extracting(ScheduledExerciseView::exerciseSlug)
				.contains("barbell-back-squat");
		assertThat(firstDay.exercises().get(0).exerciseName()).isNotBlank();
	}

	@Test
	void getSchedule_noActiveProgram_returns404() {
		UUID userId = userRepository.save(new User("sched-none+" + UUID.randomUUID() + "@example.com", "x", Role.USER)).getId();

		var response = rest.getForEntity("/api/v1/schedule?userId=" + userId, Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}
}
