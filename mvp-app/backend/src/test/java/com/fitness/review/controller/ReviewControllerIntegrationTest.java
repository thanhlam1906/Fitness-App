package com.fitness.review.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.review.dto.ReviewResponse;
import com.fitness.review.entity.VideoClip;
import com.fitness.review.repository.VideoClipRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Khối C, C4 §6.2 ke-hoach-chi-tiet-chuc-nang-v1.md — gửi clip, opt-in bắt buộc, giới hạn lượt/tuần.
 * Màn camera và chọn lại bài: doc/design-cham-form-llm-v1.md §5.
 */
@TestPropertySource(properties = "app.review-weekly-limit=2")
class ReviewControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private VideoClipRepository clips;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void submit_withOptIn_queuesPendingRequestAndStoresClip() throws Exception {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		Exercise squat = exercises.findBySlug("barbell-back-squat").orElseThrow();

		var response = submit(headers, squat.getId(), true, 1);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		assertThat(response.getBody().status()).isEqualTo("PENDING");
		assertThat(response.getBody().checks()).isEmpty();

		// Clip nằm trên đĩa để analyzer đọc; chưa xoá vì chưa chấm.
		var stored = clips.findByRequestId(response.getBody().id());
		assertThat(stored).hasSize(1);
		assertThat(Files.exists(CLIP_ROOT.resolve(stored.get(0).getStorageKey()))).isTrue();
	}

	@Test
	void submit_withoutOptIn_rejected() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		Exercise squat = exercises.findBySlug("barbell-back-squat").orElseThrow();

		assertThat(submitRaw(headers, squat.getId(), false, 1).getStatusCode())
				.isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void submit_nonAnalyzableExercise_rejected() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();

		assertThat(submitRaw(headers, nonAnalyzableExercise().getId(), true, 1).getStatusCode())
				.isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void submit_overWeeklyLimit_returns429() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();

		submit(headers, squatId, true, 1);
		submit(headers, squatId, true, 1);

		assertThat(submitRaw(headers, squatId, true, 1).getStatusCode())
				.isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
	}

	@Test
	void submit_withoutExercise_queuesRequestForRecognition() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();

		var response = rest.exchange("/api/v1/reviews?optIn=true&viewpoints=SAGITTAL&viewpoints=FRONTAL",
				HttpMethod.POST, multipart(headers, List.of("sagittal.json", "frontal.json")), ReviewResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		assertThat(response.getBody().exerciseId()).isNull();
		assertThat(response.getBody().exerciseName()).isNull();
		assertThat(clips.findByRequestId(response.getBody().id()))
				.extracting(VideoClip::getStorageKey)
				.allMatch(key -> key.endsWith(".json"));
	}

	@Test
	void get_otherUsersReview_returns404() {
		HttpHeaders owner = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID reviewId = submit(owner, squatId, true, 1).getBody().id();

		HttpHeaders stranger = newAuthedUser(Role.USER).headers();
		var resp = rest.exchange("/api/v1/reviews/" + reviewId, HttpMethod.GET,
				new HttpEntity<>(stranger), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void get_llmResult_returnsNamesWithFaultsFirst() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID reviewId = submit(headers, squatId, true, 1).getBody().id();
		finishWithLlmResult(reviewId);

		var review = rest.exchange("/api/v1/reviews/" + reviewId, HttpMethod.GET,
				new HttpEntity<>(headers), ReviewResponse.class).getBody();

		assertThat(review.checks()).extracting(ReviewResponse.CheckResult::name)
				.containsExactly("Độ sâu", "Thân thẳng");
		assertThat(review.checks().get(0).code()).isNull();
		assertThat(review.checks().get(0).isPrimary()).isTrue();
	}

	@Test
	void changeExercise_rejudgesFromStoredFeatures() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID pushupId = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID reviewId = submit(headers, squatId, true, 1).getBody().id();
		finishWithLlmResult(reviewId);

		var response = rest.exchange("/api/v1/reviews/" + reviewId + "/exercise", HttpMethod.PUT,
				new HttpEntity<>(Map.of("exerciseId", pushupId), headers), ReviewResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		assertThat(response.getBody().status()).isEqualTo("PENDING");
		assertThat(response.getBody().exerciseId()).isEqualTo(pushupId);
		assertThat(response.getBody().checks()).isEmpty();
		// Bộ số giữ lại: worker chấm lại từ đây, không cần clip.
		assertThat(jdbc.queryForObject(
				"SELECT features IS NOT NULL FROM video_review_requests WHERE id = ?", Boolean.class, reviewId))
				.isTrue();
	}

	@Test
	void changeExercise_otherUsersReview_returns404() {
		HttpHeaders owner = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID pushupId = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID reviewId = submit(owner, squatId, true, 1).getBody().id();
		finishWithLlmResult(reviewId);

		HttpHeaders stranger = newAuthedUser(Role.USER).headers();
		assertThat(changeExercise(stranger, reviewId, pushupId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void changeExercise_nonAnalyzableExercise_returns400() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID reviewId = submit(headers, squatId, true, 1).getBody().id();
		finishWithLlmResult(reviewId);

		assertThat(changeExercise(headers, reviewId, nonAnalyzableExercise().getId()).getStatusCode())
				.isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void changeExercise_pendingWithoutFeatures_returns409() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID pushupId = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID reviewId = submit(headers, squatId, true, 1).getBody().id();

		assertThat(changeExercise(headers, reviewId, pushupId).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void changeExercise_sameExercise_returns409() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID reviewId = submit(headers, squatId, true, 1).getBody().id();
		finishWithLlmResult(reviewId);

		assertThat(changeExercise(headers, reviewId, squatId).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void list_returnsOnlyOwnRequests() {
		HttpHeaders owner = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		submit(owner, squatId, true, 1);

		HttpHeaders stranger = newAuthedUser(Role.USER).headers();
		var mine = rest.exchange("/api/v1/reviews", HttpMethod.GET,
				new HttpEntity<>(stranger), ReviewResponse[].class);

		assertThat(List.of(mine.getBody())).isEmpty();
	}

	/** Giả lập analyzer chấm xong bằng LLM: có features, hai mục không gắn form_check. */
	private void finishWithLlmResult(UUID reviewId) {
		jdbc.update("UPDATE video_review_requests SET status = 'DONE', finished_at = now(), "
				+ "features = '{\"views\": []}'::jsonb WHERE id = ?", reviewId);
		jdbc.update("INSERT INTO review_results (request_id, name_vi, verdict, measured, cue_text_vi, is_primary) "
				+ "VALUES (?, 'Thân thẳng', 'PASS', '{\"evidence\": []}'::jsonb, 'Giữ thân thẳng.', false), "
				+ "(?, 'Độ sâu', 'FAIL', '{\"evidence\": []}'::jsonb, 'Hạ hông thấp hơn.', true)",
				reviewId, reviewId);
	}

	/** Seed bật analyzable cho mọi bài, nên test tự tạo một bài tắt chấm. */
	private Exercise nonAnalyzableExercise() {
		return exercises.save(new Exercise("test-" + UUID.randomUUID(), "Test", null,
				new String[0], new String[0], null, null, false));
	}

	private ResponseEntity<String> changeExercise(HttpHeaders headers, UUID reviewId, UUID exerciseId) {
		return rest.exchange("/api/v1/reviews/" + reviewId + "/exercise", HttpMethod.PUT,
				new HttpEntity<>(Map.of("exerciseId", exerciseId), headers), String.class);
	}

	private ResponseEntity<ReviewResponse> submit(HttpHeaders headers, UUID exerciseId, boolean optIn, int clipCount) {
		var response = rest.exchange(
				url(exerciseId, optIn), HttpMethod.POST, multipart(headers, clipCount), ReviewResponse.class);
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		return response;
	}

	private ResponseEntity<String> submitRaw(HttpHeaders headers, UUID exerciseId, boolean optIn, int clipCount) {
		return rest.exchange(url(exerciseId, optIn), HttpMethod.POST, multipart(headers, clipCount), String.class);
	}

	private String url(UUID exerciseId, boolean optIn) {
		return "/api/v1/reviews?exerciseId=" + exerciseId + "&optIn=" + optIn + "&viewpoints=SAGITTAL";
	}

	private HttpEntity<MultiValueMap<String, Object>> multipart(HttpHeaders headers, int clipCount) {
		return multipart(headers, IntStream.range(0, clipCount).mapToObj(i -> "clip" + i + ".mp4").toList());
	}

	private HttpEntity<MultiValueMap<String, Object>> multipart(HttpHeaders headers, List<String> filenames) {
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		filenames.forEach(name -> body.add("clips", namedResource(name)));
		HttpHeaders merged = new HttpHeaders();
		merged.addAll(headers);
		merged.setContentType(MediaType.MULTIPART_FORM_DATA);
		return new HttpEntity<>(body, merged);
	}

	/** Nội dung clip không quan trọng ở tầng này — analyzer mới là chỗ giải mã. */
	private ByteArrayResource namedResource(String filename) {
		return new ByteArrayResource("fake-clip-bytes".getBytes()) {
			@Override
			public String getFilename() {
				return filename;
			}
		};
	}
}
