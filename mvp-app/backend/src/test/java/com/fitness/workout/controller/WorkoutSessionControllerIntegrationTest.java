package com.fitness.workout.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.program.dto.CreateCustomProgramRequest;
import com.fitness.program.dto.ScheduleResponse;
import com.fitness.program.service.ProgramService;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.workout.dto.FinishSessionRequest;
import com.fitness.workout.dto.SessionResponse;
import com.fitness.workout.dto.SetLogRequest;
import com.fitness.workout.dto.SetLogResponse;
import com.fitness.workout.dto.StartSessionRequest;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.WorkoutSessionRepository;
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

class WorkoutSessionControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exerciseRepository;
	@Autowired
	private ProgramService programService;
	@Autowired
	private WorkoutSessionRepository sessionRepository;

	@Test
	void startLogFinish_fullFlow() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		Exercise squat = exerciseRepository.findBySlug("barbell-back-squat").orElseThrow();

		var started = rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(null), headers), SessionResponse.class);
		assertThat(started.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(started.getBody().status()).isEqualTo("IN_PROGRESS");
		UUID sessionId = started.getBody().id();

		var setReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 5, new BigDecimal("60.00"), (short) 7, false, null);
		var setResp = rest.exchange("/api/v1/sessions/" + sessionId + "/sets", HttpMethod.POST,
				new HttpEntity<>(setReq, headers), SetLogResponse.class);
		assertThat(setResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(setResp.getBody().reps()).isEqualTo((short) 5);

		// log lại cùng set (session, exercise, setIndex) → ghi đè, không lỗi trùng
		var overwriteReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 4, new BigDecimal("60.00"), (short) 9, false, null);
		var overwriteResp = rest.exchange("/api/v1/sessions/" + sessionId + "/sets", HttpMethod.POST,
				new HttpEntity<>(overwriteReq, headers), SetLogResponse.class);
		assertThat(overwriteResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(overwriteResp.getBody().reps()).isEqualTo((short) 4);
		assertThat(overwriteResp.getBody().id()).isEqualTo(setResp.getBody().id());

		var finishReq = new FinishSessionRequest(
				List.of(new FinishSessionRequest.PainReportRequest("KNEE_L", (short) 2, "hơi nhức")),
				(short) 7);
		var finishResp = rest.exchange("/api/v1/sessions/" + sessionId + "/finish", HttpMethod.POST,
				new HttpEntity<>(finishReq, headers), SessionResponse.class);
		assertThat(finishResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(finishResp.getBody().status()).isEqualTo("DONE");
		// Màn 6: RPE cả buổi được lưu và trả lại; thời lượng buổi tính được từ hai mốc này.
		assertThat(finishResp.getBody().sessionRpe()).isEqualTo((short) 7);
		assertThat(finishResp.getBody().startedAt()).isNotNull();
		assertThat(finishResp.getBody().finishedAt()).isNotNull();
	}

	/** RPE cả buổi hỏi mềm: bỏ trống vẫn kết buổi được, lưu NULL chứ không phải 0. */
	@Test
	void finishSession_withoutRpe_savesNull() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		var startResp = rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(null), headers), SessionResponse.class);
		UUID sessionId = startResp.getBody().id();

		var finishResp = rest.exchange("/api/v1/sessions/" + sessionId + "/finish", HttpMethod.POST,
				new HttpEntity<>(new FinishSessionRequest(List.of(), null), headers), SessionResponse.class);

		assertThat(finishResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(finishResp.getBody().sessionRpe()).isNull();
	}

	@Test
	void logSet_unknownSession_returns404() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID fakeSessionId = UUID.randomUUID();
		Exercise squat = exerciseRepository.findBySlug("barbell-back-squat").orElseThrow();
		var setReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 5, new BigDecimal("60.00"), (short) 7, false, null);

		var resp = rest.exchange("/api/v1/sessions/" + fakeSessionId + "/sets", HttpMethod.POST,
				new HttpEntity<>(setReq, headers), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	/** Màn Lịch (M3): bấm ngày đã tập thì xem lại đúng buổi đó kèm set đã log. */
	@Test
	void getByScheduledWorkout_returnsDoneSessionWithSets() {
		var user = newAuthedUser(Role.USER);
		UUID workoutId = firstWorkoutOfNewProgram(user);
		UUID sessionId = start(workoutId, user.headers()).getBody().id();
		Exercise pushUp = exerciseRepository.findBySlug("push-up").orElseThrow();
		rest.exchange("/api/v1/sessions/" + sessionId + "/sets", HttpMethod.POST, new HttpEntity<>(
				new SetLogRequest(pushUp.getId(), (short) 1, (short) 8, (short) 8, null, null, false, null),
				user.headers()), SetLogResponse.class);
		rest.exchange("/api/v1/sessions/" + sessionId + "/finish", HttpMethod.POST,
				new HttpEntity<>(new FinishSessionRequest(List.of(), (short) 7), user.headers()), SessionResponse.class);

		var resp = rest.exchange("/api/v1/sessions?scheduledWorkoutId=" + workoutId, HttpMethod.GET,
				new HttpEntity<>(user.headers()), SessionResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().id()).isEqualTo(sessionId);
		assertThat(resp.getBody().status()).isEqualTo("DONE");
		assertThat(resp.getBody().sets()).hasSize(1);
	}

	/** Dữ liệu do lỗi cũ để lại: buổi DONE thật, sau đó một buổi IN_PROGRESS rỗng cho cùng ngày. */
	@Test
	void getByScheduledWorkout_prefersDoneOverNewerEmptySession() {
		var user = newAuthedUser(Role.USER);
		UUID workoutId = firstWorkoutOfNewProgram(user);
		UUID doneId = start(workoutId, user.headers()).getBody().id();
		rest.exchange("/api/v1/sessions/" + doneId + "/finish", HttpMethod.POST,
				new HttpEntity<>(new FinishSessionRequest(List.of(), null), user.headers()), SessionResponse.class);
		sessionRepository.save(new WorkoutSession(user.userId(), workoutId));

		var resp = rest.exchange("/api/v1/sessions?scheduledWorkoutId=" + workoutId, HttpMethod.GET,
				new HttpEntity<>(user.headers()), SessionResponse.class);

		assertThat(resp.getBody().id()).isEqualTo(doneId);
	}

	@Test
	void getByScheduledWorkout_otherUser_returns404() {
		var owner = newAuthedUser(Role.USER);
		UUID workoutId = firstWorkoutOfNewProgram(owner);
		start(workoutId, owner.headers());

		var resp = rest.exchange("/api/v1/sessions?scheduledWorkoutId=" + workoutId, HttpMethod.GET,
				new HttpEntity<>(newAuthedUser(Role.USER).headers()), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	/** Trước đây mở lại ngày đã tập tạo thêm một buổi IN_PROGRESS mới cho ngày đó. */
	@Test
	void start_onDoneWorkout_returns409() {
		var user = newAuthedUser(Role.USER);
		UUID workoutId = firstWorkoutOfNewProgram(user);
		UUID sessionId = start(workoutId, user.headers()).getBody().id();
		rest.exchange("/api/v1/sessions/" + sessionId + "/finish", HttpMethod.POST,
				new HttpEntity<>(new FinishSessionRequest(List.of(), null), user.headers()), SessionResponse.class);

		var again = rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(workoutId), user.headers()), java.util.Map.class);

		assertThat(again.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	/**
	 * Lớp 1 concept-backend-v1.md §5: trước đây B gửi scheduledWorkoutId của A thì tạo được buổi,
	 * kết buổi đó thì buổi của A thành DONE và engine tăng tải chạy theo (code-reviewer M3 #7).
	 */
	@Test
	void start_withOtherUsersWorkout_returns404_andOwnersWorkoutUntouched() {
		var owner = newAuthedUser(Role.USER);
		UUID workoutId = firstWorkoutOfNewProgram(owner);

		var resp = rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(workoutId), newAuthedUser(Role.USER).headers()),
				java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(rest.exchange("/api/v1/schedule", HttpMethod.GET, new HttpEntity<>(owner.headers()),
				ScheduleResponse.class).getBody().workouts().get(0).status()).isNotEqualTo("DONE");
	}

	private org.springframework.http.ResponseEntity<SessionResponse> start(UUID workoutId, HttpHeaders headers) {
		return rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(workoutId), headers), SessionResponse.class);
	}

	private UUID firstWorkoutOfNewProgram(AuthedUser user) {
		UUID pushUpId = exerciseRepository.findBySlug("push-up").orElseThrow().getId();
		LocalDate monday = LocalDate.of(2026, 1, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
		programService.createCustomProgram(user.userId(), new CreateCustomProgramRequest(monday, 2, List.of(
				new CreateCustomProgramRequest.CustomDayRequest(1, "Đẩy", List.of(
						new CreateCustomProgramRequest.CustomExerciseRequest(pushUpId, 3, 8, 12, null, 90))))));
		return rest.exchange("/api/v1/schedule", HttpMethod.GET, new HttpEntity<>(user.headers()),
				ScheduleResponse.class).getBody().workouts().get(0).id();
	}

	/** concept-backend-v1.md §5 Lớp 3: user B gọi tài nguyên của user A → 404, không phải 403. */
	@Test
	void logSet_otherUsersSession_returns404NotLeaking() {
		HttpHeaders ownerHeaders = newAuthedUser(Role.USER).headers();
		HttpHeaders otherHeaders = newAuthedUser(Role.USER).headers();
		Exercise squat = exerciseRepository.findBySlug("barbell-back-squat").orElseThrow();

		UUID sessionId = rest.exchange("/api/v1/sessions", HttpMethod.POST,
				new HttpEntity<>(new StartSessionRequest(null), ownerHeaders), SessionResponse.class)
				.getBody().id();

		var setReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 5, new BigDecimal("60.00"), null, false, null);
		var resp = rest.exchange("/api/v1/sessions/" + sessionId + "/sets", HttpMethod.POST,
				new HttpEntity<>(setReq, otherHeaders), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}
}
