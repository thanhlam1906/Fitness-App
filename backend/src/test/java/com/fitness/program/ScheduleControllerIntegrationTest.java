package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class ScheduleControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProgramTemplateRepository templateRepository;
	@Autowired
	private ProgramService programService;

	private static final LocalDate A_MONDAY =
			LocalDate.of(2026, 9, 7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

	@Test
	void getSchedule_returnsWorkoutsWithResolvedExerciseNames() {
		var user = newAuthedUser(Role.USER);
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x")).findFirst().orElseThrow();
		programService.createProgram(
				user.userId(), template.getId(), Map.of("barbell-back-squat", 60.0),
				Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);

		var response = rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(user.headers()), ScheduleResponse.class);

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
		var user = newAuthedUser(Role.USER);

		var response = rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(user.headers()), java.util.Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void getSchedule_seesOnlyOwnProgram_notOtherUsers() {
		var userA = newAuthedUser(Role.USER);
		var userB = newAuthedUser(Role.USER);
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x")).findFirst().orElseThrow();
		programService.createProgram(
				userA.userId(), template.getId(), Map.of(), Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);

		// userB chưa có chương trình riêng — dù userA vừa tạo, JWT của B không cho thấy lịch của A
		var response = rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(userB.headers()), java.util.Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}
}
