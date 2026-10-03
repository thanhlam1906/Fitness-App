package com.fitness.program.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.dto.CreateCustomProgramRequest;
import com.fitness.program.dto.CurrentProgramResponse;
import com.fitness.program.dto.EditDayRequest;
import com.fitness.program.dto.ScheduleResponse;
import com.fitness.program.dto.ScheduledExerciseView;
import com.fitness.program.dto.ScheduledWorkoutView;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.program.service.ProgramService;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/**
 * Sửa ở cấp chương trình (doc/design-chuong-trinh-v1.md §4). Chương trình full-body-3x
 * bắt đầu HÔM KIA, tập mọi ngày: A hôm kia, B hôm qua (hai buổi quá hạn), A hôm nay, B mai…
 * Backend dùng LocalDate.now() nên dữ liệu phải bám theo hôm nay.
 */
class ProgramEditIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProgramService programService;
	@Autowired
	private ProgramTemplateRepository templates;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private ScheduledWorkoutRepository scheduledWorkouts;
	@Autowired
	private WorkoutSessionRepository sessions;

	// Không static: tính sau khi context đã chạy khối static đặt giờ VN của FitnessApplication, để
	// "hôm nay" của test khớp "hôm nay" của backend kể cả từ 0h tới 7h sáng.
	private final LocalDate TODAY = LocalDate.now();

	@Test
	void editDay_changesOpenWorkoutsOfThatLabelOnly() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());
		UUID ohp = slug("overhead-press");
		ScheduledWorkoutView todayA = workoutOn(user.headers(), TODAY);
		markDone(todayA.id());

		var resp = editDay(user.headers(), new EditDayRequest("A", List.of(),
				List.of(new EditDayRequest.ExerciseTarget(ohp, 5, 6, 8, new BigDecimal("35"))), List.of()));

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		ScheduleResponse after = schedule(user.headers());
		long openA = after.workouts().stream()
				.filter(w -> "A".equals(w.label()) && w.scheduledOn().isAfter(TODAY)).count();
		assertThat(resp.getBody().updatedWorkouts()).isEqualTo((int) openA);
		for (ScheduledWorkoutView w : after.workouts()) {
			ScheduledExerciseView row = w.exercises().stream()
					.filter(e -> e.exerciseId().equals(ohp)).findFirst().orElse(null);
			boolean open = "A".equals(w.label()) && w.scheduledOn().isAfter(TODAY);
			if (open) {
				assertThat(row.targetSets()).as(w.scheduledOn().toString()).isEqualTo(5);
				assertThat(row.targetRepsMax()).isEqualTo(8);
				assertThat(row.targetLoadKg()).isEqualByComparingTo("35");
			} else if (row != null) {
				// Buổi A quá hạn (hôm kia) và buổi A đã tập (hôm nay) giữ nguyên 3×5.
				assertThat(row.targetSets()).as(w.scheduledOn().toString()).isEqualTo(3);
			}
		}
	}

	@Test
	void editDay_skipsWorkoutInProgress() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());
		UUID ohp = slug("overhead-press");
		ScheduledWorkoutView todayA = workoutOn(user.headers(), TODAY);
		sessions.save(new WorkoutSession(user.userId(), todayA.id()));

		editDay(user.headers(), new EditDayRequest("A", List.of(),
				List.of(new EditDayRequest.ExerciseTarget(ohp, 5, 5, 5, null)), List.of()));

		assertThat(targetSets(workoutOn(user.headers(), TODAY), ohp)).isEqualTo(3);
		assertThat(targetSets(workoutOn(user.headers(), TODAY.plusDays(2)), ohp)).isEqualTo(5);
		// Màn Chương trình cần biết buổi nào đang tập dở để đếm đúng buổi sẽ sửa.
		assertThat(workoutOn(user.headers(), TODAY).inProgress()).isTrue();
		assertThat(workoutOn(user.headers(), TODAY.plusDays(2)).inProgress()).isFalse();
	}

	@Test
	void editDay_addSkipsWorkoutsThatHaveIt_andRemoveDeletes() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());
		UUID ohp = slug("overhead-press");
		UUID pushUp = slug("push-up");
		// Một buổi A đã được sửa riêng: có sẵn chống đẩy.
		ScheduledWorkoutView someA = workoutOn(user.headers(), TODAY.plusDays(2));
		rest.exchange("/api/v1/schedule/workouts/" + someA.id() + "/exercises", HttpMethod.POST,
				new HttpEntity<>(new ScheduleController.AddExerciseRequest(pushUp, 2, 10, 10, null, null),
						user.headers()), ScheduledExerciseView.class);

		editDay(user.headers(), new EditDayRequest("A", List.of(ohp), List.of(),
				List.of(new EditDayRequest.ExerciseTarget(pushUp, 3, 8, 15, null))));

		for (ScheduledWorkoutView w : schedule(user.headers()).workouts()) {
			if (!"A".equals(w.label()) || w.scheduledOn().isBefore(TODAY)) {
				continue;
			}
			assertThat(w.exercises()).extracting(ScheduledExerciseView::exerciseId)
					.as(w.scheduledOn().toString()).doesNotContain(ohp)
					.filteredOn(id -> id.equals(pushUp)).hasSize(1);
		}
		// Buổi đã sửa riêng giữ số của nó, không bị thêm dòng thứ hai.
		assertThat(targetSets(workoutOn(user.headers(), TODAY.plusDays(2)), pushUp)).isEqualTo(2);
	}

	@Test
	void editDay_labelWithoutOpenWorkouts_returns409() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());

		var resp = rest.exchange("/api/v1/schedule/days", HttpMethod.PUT,
				new HttpEntity<>(new EditDayRequest("Z", List.of(), List.of(), List.of()), user.headers()),
				String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void editDay_unknownExercise_orRepsMaxBelowReps_returns400() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());
		UUID ohp = slug("overhead-press");

		var unknown = rest.exchange("/api/v1/schedule/days", HttpMethod.PUT, new HttpEntity<>(
				new EditDayRequest("A", List.of(), List.of(),
						List.of(new EditDayRequest.ExerciseTarget(UUID.randomUUID(), 3, 8, 8, null))),
				user.headers()), String.class);
		var inverted = rest.exchange("/api/v1/schedule/days", HttpMethod.PUT, new HttpEntity<>(
				new EditDayRequest("A", List.of(),
						List.of(new EditDayRequest.ExerciseTarget(ohp, 3, 10, 8, null)), List.of()),
				user.headers()), String.class);

		var nullItem = rest.exchange("/api/v1/schedule/days", HttpMethod.PUT, new HttpEntity<>(
				new EditDayRequest("A", java.util.Arrays.asList((UUID) null), List.of(), List.of()),
				user.headers()), String.class);

		assertThat(unknown.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(inverted.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(nullItem.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void changeTrainingDays_movesOpenWorkoutsInOrderOntoNewWeekdays() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());
		markDone(workoutOn(user.headers(), TODAY).id());
		List<ScheduledWorkoutView> before = schedule(user.headers()).workouts();
		List<ScheduledWorkoutView> openBefore = before.stream().filter(w -> w.scheduledOn().isAfter(TODAY)).toList();

		var resp = rest.exchange("/api/v1/programs/current/training-days", HttpMethod.PUT,
				new HttpEntity<>(new ProgramController.TrainingDaysRequest(List.of(1, 3, 5)), user.headers()),
				ProgramController.TrainingDaysResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().movedWorkouts()).isEqualTo(openBefore.size());
		Map<UUID, ScheduledWorkoutView> after = schedule(user.headers()).workouts().stream()
				.collect(java.util.stream.Collectors.toMap(ScheduledWorkoutView::id, w -> w));
		// Buổi quá hạn và buổi đã tập hôm nay giữ nguyên ngày.
		before.stream().filter(w -> !w.scheduledOn().isAfter(TODAY))
				.forEach(w -> assertThat(after.get(w.id()).scheduledOn()).isEqualTo(w.scheduledOn()));
		// Buổi mở: đúng thứ mới, không trước hôm nay, không trùng hôm nay (đã có buổi), giữ thứ tự.
		LocalDate previous = TODAY;
		for (ScheduledWorkoutView w : openBefore) {
			LocalDate moved = after.get(w.id()).scheduledOn();
			assertThat(moved.getDayOfWeek().getValue()).isIn(1, 3, 5);
			assertThat(moved).isAfter(previous);
			assertThat(after.get(w.id()).label()).isEqualTo(w.label());
			assertThat(after.get(w.id()).weekIndex())
					.isEqualTo((int) java.time.temporal.ChronoUnit.DAYS.between(TODAY.minusDays(2), moved) / 7 + 1);
			previous = moved;
		}
		assertThat(schedule(user.headers()).restDays()).containsExactlyInAnyOrder((short) 2, (short) 4, (short) 6, (short) 7);
	}

	@Test
	void changeTrainingDays_customProgram_returns409() {
		var user = newAuthedUser(Role.USER);
		programService.createCustomProgram(user.userId(), new CreateCustomProgramRequest(TODAY, 1, List.of(
				new CreateCustomProgramRequest.CustomDay(TODAY.getDayOfWeek().getValue(), "T", List.of(
						new CreateCustomProgramRequest.CustomExercise(slug("push-up"), 3, 8, 12, null, 90))))));

		var resp = rest.exchange("/api/v1/programs/current/training-days", HttpMethod.PUT,
				new HttpEntity<>(new ProgramController.TrainingDaysRequest(List.of(1)), user.headers()), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void changeTrainingDays_emptyOrDuplicate_returns400() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());

		for (List<Integer> days : List.of(List.<Integer>of(), List.of(1, 1), List.of(0))) {
			var resp = rest.exchange("/api/v1/programs/current/training-days", HttpMethod.PUT,
					new HttpEntity<>(new ProgramController.TrainingDaysRequest(days), user.headers()), String.class);
			assertThat(resp.getStatusCode()).as(days.toString()).isEqualTo(HttpStatus.BAD_REQUEST);
		}
	}

	@Test
	void current_includesTemplateSessionRange() {
		var user = newAuthedUser(Role.USER);
		createDailyProgram(user.userId());

		CurrentProgramResponse current = rest.exchange("/api/v1/programs/current", HttpMethod.GET,
				new HttpEntity<>(user.headers()), CurrentProgramResponse.class).getBody();

		assertThat(current.sessionsMin()).isEqualTo((short) 2);
		assertThat(current.sessionsMax()).isEqualTo((short) 3);
	}

	// ---- trợ giúp ----

	private void createDailyProgram(UUID userId) {
		UUID templateId = templates.findBySlug("full-body-3x").orElseThrow().getId();
		programService.createProgram(userId, templateId, Map.of("overhead-press", 30.0), Set.of(), TODAY.minusDays(2));
	}

	private UUID slug(String slug) {
		return exercises.findBySlug(slug).orElseThrow().getId();
	}

	private void markDone(UUID workoutId) {
		ScheduledWorkout workout = scheduledWorkouts.findById(workoutId).orElseThrow();
		workout.updateStatus("DONE");
		scheduledWorkouts.save(workout);
	}

	private org.springframework.http.ResponseEntity<ScheduleController.EditDayResponse> editDay(
			HttpHeaders headers, EditDayRequest request) {
		return rest.exchange("/api/v1/schedule/days", HttpMethod.PUT, new HttpEntity<>(request, headers),
				ScheduleController.EditDayResponse.class);
	}

	private ScheduleResponse schedule(HttpHeaders headers) {
		return rest.exchange("/api/v1/schedule", HttpMethod.GET, new HttpEntity<>(headers), ScheduleResponse.class)
				.getBody();
	}

	private ScheduledWorkoutView workoutOn(HttpHeaders headers, LocalDate date) {
		return schedule(headers).workouts().stream().filter(w -> w.scheduledOn().equals(date)).findFirst().orElseThrow();
	}

	private static int targetSets(ScheduledWorkoutView workout, UUID exerciseId) {
		return workout.exercises().stream().filter(e -> e.exerciseId().equals(exerciseId)).findFirst().orElseThrow()
				.targetSets();
	}
}
