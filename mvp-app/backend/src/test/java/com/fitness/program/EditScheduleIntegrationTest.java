package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Màn "Lịch riêng" — sửa/thêm/xoá bài tập của ĐÚNG một buổi. */
class EditScheduleIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private ProgramService programService;
	@Autowired
	private ScheduledWorkoutRepository scheduledWorkouts;

	@Test
	void update_changesOnlyThatWorkout() {
		var user = newAuthedUser(Role.USER);
		createTwoWeekProgram(user.userId());
		ScheduleResponse before = getSchedule(user.headers());
		ScheduledExerciseView target = before.workouts().get(0).exercises().get(0);

		var updated = rest.exchange(
				"/api/v1/schedule/exercises/" + target.id(), HttpMethod.PUT,
				new HttpEntity<>(new ScheduleController.UpdateExerciseRequest(
						5, 6, 6, new BigDecimal("42.50"), 120), user.headers()),
				ScheduledExerciseView.class);

		assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(updated.getBody().targetSets()).isEqualTo(5);
		assertThat(updated.getBody().targetReps()).isEqualTo(6);
		assertThat(updated.getBody().targetLoadKg()).isEqualByComparingTo("42.50");
		assertThat(updated.getBody().restSeconds()).isEqualTo(120);

		// Buổi kế tiếp không đổi — sửa chỉ áp cho buổi đang mở.
		ScheduleResponse after = getSchedule(user.headers());
		assertThat(after.workouts().get(1).exercises().get(0).targetSets())
				.isEqualTo(before.workouts().get(1).exercises().get(0).targetSets());
	}

	@Test
	void addAndRemove_changeOnlyThatWorkoutsExerciseList() {
		var user = newAuthedUser(Role.USER);
		createTwoWeekProgram(user.userId());
		ScheduledWorkoutView first = getSchedule(user.headers()).workouts().get(0);
		int sizeBefore = first.exercises().size();
		UUID rowId = exercises.findBySlug("bent-over-row").orElseThrow().getId();

		var added = rest.exchange(
				"/api/v1/schedule/workouts/" + first.id() + "/exercises", HttpMethod.POST,
				new HttpEntity<>(new ScheduleController.AddExerciseRequest(
						rowId, 3, 30, 30, null, 60), user.headers()),
				ScheduledExerciseView.class);

		assertThat(added.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(added.getBody().orderIndex()).isEqualTo(sizeBefore + 1);
		assertThat(getSchedule(user.headers()).workouts().get(0).exercises()).hasSize(sizeBefore + 1);

		var removed = rest.exchange(
				"/api/v1/schedule/exercises/" + added.getBody().id(), HttpMethod.DELETE,
				new HttpEntity<>(user.headers()), Void.class);

		assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		assertThat(getSchedule(user.headers()).workouts().get(0).exercises()).hasSize(sizeBefore);
	}

	@Test
	void update_onFinishedWorkout_returns409() {
		var user = newAuthedUser(Role.USER);
		createTwoWeekProgram(user.userId());
		ScheduledWorkoutView first = getSchedule(user.headers()).workouts().get(0);
		ScheduledWorkout workout = scheduledWorkouts.findById(first.id()).orElseThrow();
		workout.updateStatus("DONE");
		scheduledWorkouts.save(workout);

		var resp = rest.exchange(
				"/api/v1/schedule/exercises/" + first.exercises().get(0).id(), HttpMethod.PUT,
				new HttpEntity<>(new ScheduleController.UpdateExerciseRequest(
						5, 5, 5, null, null), user.headers()),
				String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void update_onSomeoneElsesSchedule_returns404() {
		var owner = newAuthedUser(Role.USER);
		createTwoWeekProgram(owner.userId());
		UUID targetId = getSchedule(owner.headers()).workouts().get(0).exercises().get(0).id();

		var stranger = newAuthedUser(Role.USER);
		createTwoWeekProgram(stranger.userId());

		var resp = rest.exchange(
				"/api/v1/schedule/exercises/" + targetId, HttpMethod.PUT,
				new HttpEntity<>(new ScheduleController.UpdateExerciseRequest(
						5, 5, 5, null, null), stranger.headers()),
				String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	/** Lịch custom 1 buổi/tuần × 2 tuần, mỗi buổi 1 bài — đủ để kiểm tra "chỉ đổi buổi đó". */
	private void createTwoWeekProgram(UUID userId) {
		UUID pushUpId = exercises.findBySlug("push-up").orElseThrow().getId();
		LocalDate monday = LocalDate.of(2026, 1, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
		programService.createCustomProgram(userId, new CreateCustomProgramRequest(monday, 2, List.of(
				new CreateCustomProgramRequest.CustomDay(1, "Đẩy", List.of(
						new CreateCustomProgramRequest.CustomExercise(pushUpId, 3, 8, 12, null, 90))))));
	}

	private ScheduleResponse getSchedule(HttpHeaders headers) {
		return rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(headers), ScheduleResponse.class).getBody();
	}
}
