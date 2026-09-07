package com.fitness.workout;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.user.Role;
import com.fitness.user.User;
import com.fitness.user.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;

class WorkoutSessionControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private UserRepository userRepository;
	@Autowired
	private ExerciseRepository exerciseRepository;

	@Test
	void startLogFinish_fullFlow() {
		UUID userId = userRepository.save(new User("sess+" + UUID.randomUUID() + "@example.com", "x", Role.USER)).getId();
		Exercise squat = exerciseRepository.findBySlug("barbell-back-squat").orElseThrow();

		var started = rest.postForEntity(
				"/api/v1/sessions", new StartSessionRequest(userId, null), SessionResponse.class);
		assertThat(started.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(started.getBody().status()).isEqualTo("IN_PROGRESS");
		UUID sessionId = started.getBody().id();

		var setReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 5, new BigDecimal("60.00"), (short) 7, false, null);
		var setResp = rest.postForEntity("/api/v1/sessions/" + sessionId + "/sets", setReq, SetLogResponse.class);
		assertThat(setResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(setResp.getBody().reps()).isEqualTo((short) 5);

		// log lại cùng set (session, exercise, setIndex) → ghi đè, không lỗi trùng
		var overwriteReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 4, new BigDecimal("60.00"), (short) 9, false, null);
		var overwriteResp = rest.postForEntity("/api/v1/sessions/" + sessionId + "/sets", overwriteReq, SetLogResponse.class);
		assertThat(overwriteResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(overwriteResp.getBody().reps()).isEqualTo((short) 4);
		assertThat(overwriteResp.getBody().id()).isEqualTo(setResp.getBody().id());

		var finishReq = new FinishSessionRequest(
				List.of(new FinishSessionRequest.PainReportRequest("KNEE_L", (short) 2, "hơi nhức")));
		var finishResp = rest.postForEntity(
				"/api/v1/sessions/" + sessionId + "/finish", finishReq, SessionResponse.class);
		assertThat(finishResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(finishResp.getBody().status()).isEqualTo("DONE");
	}

	@Test
	void logSet_unknownSession_returns404() {
		UUID fakeSessionId = UUID.randomUUID();
		Exercise squat = exerciseRepository.findBySlug("barbell-back-squat").orElseThrow();
		var setReq = new SetLogRequest(squat.getId(), (short) 1, (short) 5, (short) 5, new BigDecimal("60.00"), (short) 7, false, null);

		var resp = rest.postForEntity("/api/v1/sessions/" + fakeSessionId + "/sets", setReq, java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}
}
