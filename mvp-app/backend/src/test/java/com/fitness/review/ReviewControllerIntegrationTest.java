package com.fitness.review;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** Khối C, C4 §6.2 ke-hoach-chi-tiet-chuc-nang-v1.md — gửi clip, opt-in bắt buộc, giới hạn lượt/tuần. */
@TestPropertySource(properties = "app.review-weekly-limit=2")
class ReviewControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private VideoClipRepository clips;

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
		Exercise row = exercises.findBySlug("bent-over-row").orElseThrow();

		assertThat(submitRaw(headers, row.getId(), true, 1).getStatusCode())
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
	void get_otherUsersReview_returns404() {
		HttpHeaders owner = newAuthedUser(Role.USER).headers();
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID reviewId = submit(owner, squatId, true, 1).getBody().id();

		HttpHeaders stranger = newAuthedUser(Role.USER).headers();
		var resp = rest.exchange("/api/v1/reviews/" + reviewId, HttpMethod.GET,
				new HttpEntity<>(stranger), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	private org.springframework.http.ResponseEntity<ReviewResponse> submit(
			HttpHeaders headers, UUID exerciseId, boolean optIn, int clipCount) {
		var response = rest.exchange(
				url(exerciseId, optIn), HttpMethod.POST, multipart(headers, clipCount), ReviewResponse.class);
		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		return response;
	}

	private org.springframework.http.ResponseEntity<String> submitRaw(
			HttpHeaders headers, UUID exerciseId, boolean optIn, int clipCount) {
		return rest.exchange(url(exerciseId, optIn), HttpMethod.POST, multipart(headers, clipCount), String.class);
	}

	private String url(UUID exerciseId, boolean optIn) {
		return "/api/v1/reviews?exerciseId=" + exerciseId + "&optIn=" + optIn + "&viewpoints=SAGITTAL";
	}

	private HttpEntity<MultiValueMap<String, Object>> multipart(HttpHeaders headers, int clipCount) {
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		for (int i = 0; i < clipCount; i++) {
			body.add("clips", namedResource("clip" + i + ".mp4"));
		}
		HttpHeaders merged = new HttpHeaders();
		merged.addAll(headers);
		merged.setContentType(MediaType.MULTIPART_FORM_DATA);
		return new HttpEntity<>(body, merged);
	}

	/** Nội dung clip không quan trọng ở tầng này — analyzer mới là chỗ giải mã video. */
	private ByteArrayResource namedResource(String filename) {
		return new ByteArrayResource("fake-video-bytes".getBytes()) {
			@Override
			public String getFilename() {
				return filename;
			}
		};
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
}
