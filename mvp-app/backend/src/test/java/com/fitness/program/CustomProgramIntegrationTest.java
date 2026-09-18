package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Lịch tự thiết kế: Program không gắn template nào. */
class CustomProgramIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProgramRepository programs;
	@Autowired
	private ExerciseRepository exercises;

	@Test
	void current_programWithoutTemplate_returnsCustomLabelInsteadOfFailing() {
		var user = newAuthedUser(Role.USER);
		programs.save(new Program(user.userId(), null, "{}", new Short[0], LocalDate.now()));

		var resp = rest.exchange("/api/v1/programs/current", HttpMethod.GET,
				new HttpEntity<>(user.headers()), CurrentProgramResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().templateId()).isNull();
		assertThat(resp.getBody().templateName()).isEqualTo("Lịch tự thiết kế");
	}

	@Test
	void createCustom_generatesWorkoutsOnChosenWeekdaysWithGivenSetsAndReps() {
		var user = newAuthedUser(Role.USER);
		UUID pushUpId = exercises.findBySlug("push-up").orElseThrow().getId();
		LocalDate monday = LocalDate.of(2026, 1, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

		var request = new CreateCustomProgramRequest(monday, 2, List.of(
				new CreateCustomProgramRequest.CustomDay(1, "Đẩy", List.of(
						new CreateCustomProgramRequest.CustomExercise(pushUpId, 4, 8, 12, null, 90))),
				new CreateCustomProgramRequest.CustomDay(5, "Kéo", List.of(
						new CreateCustomProgramRequest.CustomExercise(pushUpId, 3, 10, 10, 20.0, null)))));

		var created = rest.exchange("/api/v1/programs/custom", HttpMethod.POST,
				new HttpEntity<>(request, user.headers()), CreateProgramResponse.class);
		assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);

		ScheduleResponse schedule = rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(user.headers()), ScheduleResponse.class).getBody();

		// 2 thứ × 2 tuần
		assertThat(schedule.workouts()).hasSize(4);
		assertThat(schedule.workouts()).allMatch(w ->
				w.scheduledOn().getDayOfWeek() == DayOfWeek.MONDAY
						|| w.scheduledOn().getDayOfWeek() == DayOfWeek.FRIDAY);
		// Ngày nghỉ = mọi thứ KHÔNG được chọn, để màn lịch tuần hiện đúng "Ngày nghỉ".
		assertThat(schedule.restDays()).containsExactlyInAnyOrder(
				(short) 2, (short) 3, (short) 4, (short) 6, (short) 7);

		var monday1 = schedule.workouts().get(0);
		assertThat(monday1.label()).isEqualTo("Đẩy");
		assertThat(monday1.exercises()).hasSize(1);
		assertThat(monday1.exercises().get(0).targetSets()).isEqualTo(4);
		assertThat(monday1.exercises().get(0).targetReps()).isEqualTo(8);
		assertThat(monday1.exercises().get(0).targetRepsMax()).isEqualTo(12);
		assertThat(monday1.exercises().get(0).restSeconds()).isEqualTo(90);
	}

	@Test
	void createCustom_unknownExercise_returns400() {
		var user = newAuthedUser(Role.USER);
		var request = new CreateCustomProgramRequest(LocalDate.now(), 1, List.of(
				new CreateCustomProgramRequest.CustomDay(1, "Đẩy", List.of(
						new CreateCustomProgramRequest.CustomExercise(
								UUID.randomUUID(), 3, 8, 8, null, null)))));

		var resp = rest.exchange("/api/v1/programs/custom", HttpMethod.POST,
				new HttpEntity<>(request, user.headers()), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}
}
