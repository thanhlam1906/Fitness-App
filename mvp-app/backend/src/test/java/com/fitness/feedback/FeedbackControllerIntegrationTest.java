package com.fitness.feedback;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.assistant.AssistantMessage;
import com.fitness.assistant.AssistantMessageRepository;
import com.fitness.auth.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

/** Bất biến 3: mọi góp ý do máy sinh ra có nút "cái này sai" — kể cả câu trả lời của trợ lý. */
class FeedbackControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private AssistantMessageRepository messages;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void wrongAssistantAnswer_isRecordedWithNote() {
		AuthedUser me = newAuthedUser(Role.USER);
		UUID answerId = assistantAnswerOf(me.userId());

		var resp = post(me, Map.of("assistantMessageId", answerId, "isWrong", true, "note", "sai số buổi"));

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(jdbc.queryForObject(
				"select note from cue_feedback where assistant_message_id = ?", String.class, answerId))
				.isEqualTo("sai số buổi");
	}

	@Test
	void otherUsersAnswer_returns404_notRecorded() {
		UUID answerId = assistantAnswerOf(newAuthedUser(Role.USER).userId());

		var resp = post(newAuthedUser(Role.USER), Map.of("assistantMessageId", answerId, "isWrong", true));

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(jdbc.queryForObject(
				"select count(*) from cue_feedback where assistant_message_id = ?", Long.class, answerId)).isZero();
	}

	/**
	 * Trước đây reviewResultId / loadDecisionId của người khác vẫn nhận: B ghi được góp ý lên kết
	 * quả của A (làm bẩn số liệu admin), id không tồn tại thì 500 lộ id nào có thật.
	 */
	@Test
	void otherUsersReviewResultOrLoadDecision_returns404() {
		AuthedUser owner = newAuthedUser(Role.USER);
		UUID requestId = jdbc.queryForObject(
				"insert into video_review_requests (user_id) values (?) returning id", UUID.class, owner.userId());
		UUID resultId = jdbc.queryForObject(
				"insert into review_results (request_id, verdict, name_vi) values (?, 'PASS', 'Độ sâu') returning id",
				UUID.class, requestId);
		AuthedUser other = newAuthedUser(Role.USER);

		assertThat(post(other, Map.of("reviewResultId", resultId, "isWrong", true)).getStatusCode())
				.isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(post(other, Map.of("loadDecisionId", UUID.randomUUID(), "isWrong", true)).getStatusCode())
				.isEqualTo(HttpStatus.NOT_FOUND);
		// Chủ kết quả thì vẫn góp ý được.
		assertThat(post(owner, Map.of("reviewResultId", resultId, "isWrong", true)).getStatusCode())
				.isEqualTo(HttpStatus.CREATED);
	}

	@Test
	void twoSourcesAtOnce_rejected() {
		AuthedUser me = newAuthedUser(Role.USER);
		var resp = post(me, Map.of("assistantMessageId", assistantAnswerOf(me.userId()),
				"loadDecisionId", UUID.randomUUID(), "isWrong", true));

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	private UUID assistantAnswerOf(UUID userId) {
		return messages.save(new AssistantMessage(userId, UUID.randomUUID(), "ASSISTANT", "Tuần này bạn có 3 buổi."))
				.getId();
	}

	private org.springframework.http.ResponseEntity<String> post(AuthedUser user, Map<String, Object> body) {
		return rest.exchange("/api/v1/feedback", HttpMethod.POST, new HttpEntity<>(body, user.headers()), String.class);
	}
}
