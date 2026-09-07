package com.fitness.workout;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.program.ScheduleResponse;
import com.fitness.program.ScheduledExerciseView;
import com.fitness.program.ScheduledWorkoutView;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.user.Role;
import com.fitness.user.User;
import com.fitness.user.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * content-seed-v1.md §8 — hai bài kiểm tra bắt buộc phải qua trước khi coi
 * bộ seed (và giờ là engine wiring) chạy thật. Đánh giá theo TỪNG BUỔI, verify
 * bằng đúng đường người dùng thật đi qua (API), không gọi thẳng service nội bộ.
 */
class ProgressionApplicationServiceIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private ProgramTemplateRepository templateRepository;
	@Autowired
	private com.fitness.program.ProgramService programService;

	private static final LocalDate A_MONDAY =
			LocalDate.of(2026, 9, 7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

	@Test
	void linearProgression_allSetsMet_increasesLoadForFutureOccurrences() {
		UUID userId = userRepository.save(new User("lin+" + UUID.randomUUID() + "@example.com", "x", Role.USER)).getId();
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x")).findFirst().orElseThrow();
		programService.createProgram(
				userId, template.getId(), Map.of("barbell-back-squat", 60.0),
				Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);

		ScheduleResponse before = rest.getForObject("/api/v1/schedule?userId=" + userId, ScheduleResponse.class);
		ScheduledWorkoutView dayA = before.workouts().get(0); // Monday, label "A", squat 3x5 @ 60kg
		ScheduledExerciseView squatBefore = findSquat(dayA);
		assertThat(squatBefore.targetLoadKg()).isEqualByComparingTo(new BigDecimal("60.00"));

		SessionResponse session = rest.postForEntity(
				"/api/v1/sessions", new StartSessionRequest(userId, dayA.id()), SessionResponse.class)
				.getBody();
		logSet(session.id(), squatBefore, 1, 5);
		logSet(session.id(), squatBefore, 2, 5);
		logSet(session.id(), squatBefore, 3, 5);
		rest.postForEntity("/api/v1/sessions/" + session.id() + "/finish", new FinishSessionRequest(List.of()), SessionResponse.class);

		ScheduleResponse after = rest.getForObject("/api/v1/schedule?userId=" + userId, ScheduleResponse.class);
		// Day B (thứ 3, ngày kế) và mọi lần squat xuất hiện sau đó phải lên 62.5kg
		ScheduledExerciseView squatDayB = findSquat(after.workouts().get(1));
		assertThat(squatDayB.targetLoadKg()).isEqualByComparingTo(new BigDecimal("62.50"));
		assertThat(squatDayB.loadChangeReason()).contains("tăng tải");
	}

	@Test
	void doubleProgression_missedFloor_holdsNotDeloadsOnFirstMiss() {
		UUID userId = userRepository.save(new User("dbl+" + UUID.randomUUID() + "@example.com", "x", Role.USER)).getId();
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("upper-lower-4x")).findFirst().orElseThrow();
		programService.createProgram(
				userId, template.getId(), Map.of("barbell-back-squat", 80.0),
				Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);

		ScheduleResponse before = rest.getForObject("/api/v1/schedule?userId=" + userId, ScheduleResponse.class);
		// order: Trên A (T2), Dưới A (T3, squat 4x6-8), Trên B (T4), Dưới B (T5, squat 3x8-10)
		ScheduledWorkoutView duoiA = before.workouts().get(1);
		ScheduledExerciseView squat = findSquat(duoiA);
		assertThat(squat.targetLoadKg()).isEqualByComparingTo(new BigDecimal("80.00"));

		SessionResponse session = rest.postForEntity(
				"/api/v1/sessions", new StartSessionRequest(userId, duoiA.id()), SessionResponse.class)
				.getBody();
		// target 6-8: chỉ đạt 5 rep (dưới sàn 6) ở set đầu — trượt thật, nhưng mới trượt LẦN ĐẦU nên chưa deload
		logSet(session.id(), squat, 1, 5);
		logSet(session.id(), squat, 2, 6);
		logSet(session.id(), squat, 3, 6);
		logSet(session.id(), squat, 4, 6);
		rest.postForEntity("/api/v1/sessions/" + session.id() + "/finish", new FinishSessionRequest(List.of()), SessionResponse.class);

		ScheduleResponse after = rest.getForObject("/api/v1/schedule?userId=" + userId, ScheduleResponse.class);
		ScheduledWorkoutView duoiBAfter = after.workouts().stream()
				.filter(w -> findSquatOrNull(w) != null && w.scheduledOn().isAfter(duoiA.scheduledOn()))
				.findFirst().orElseThrow();
		ScheduledExerciseView squatAfter = findSquat(duoiBAfter);
		// HOLD, không phải DOWN — 1 buổi trượt sàn chưa đủ để deload (cần lặp 2 buổi liên tiếp)
		assertThat(squatAfter.targetLoadKg()).isEqualByComparingTo(new BigDecimal("80.00"));
	}

	private void logSet(UUID sessionId, ScheduledExerciseView squat, int setIndex, int reps) {
		var req = new SetLogRequest(
				exerciseIdFor(squat), (short) setIndex, (short) squat.targetReps(), (short) reps,
				squat.targetLoadKg(), null, false, null);
		rest.postForEntity("/api/v1/sessions/" + sessionId + "/sets", req, SetLogResponse.class);
	}

	// ScheduledExerciseView không mang exercise_id thô (chỉ slug/tên) — tra lại qua GET /exercises theo slug.
	private UUID exerciseIdFor(ScheduledExerciseView squat) {
		var exercises = rest.getForObject("/api/v1/exercises", com.fitness.content.ExerciseResponse[].class);
		return java.util.Arrays.stream(exercises)
				.filter(e -> e.slug().equals(squat.exerciseSlug()))
				.findFirst().orElseThrow(() -> new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND))
				.id();
	}

	private ScheduledExerciseView findSquat(ScheduledWorkoutView workout) {
		return workout.exercises().stream()
				.filter(e -> e.exerciseSlug().equals("barbell-back-squat"))
				.findFirst().orElseThrow();
	}

	private ScheduledExerciseView findSquatOrNull(ScheduledWorkoutView workout) {
		return workout.exercises().stream()
				.filter(e -> e.exerciseSlug().equals("barbell-back-squat"))
				.findFirst().orElse(null);
	}
}
