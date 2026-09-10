package com.fitness.workout;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
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
