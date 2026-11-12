package com.fitness.review.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doCallRealMethod;

import com.fitness.auth.entity.Role;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.review.service.ClipStorage;
import com.fitness.support.PostgresIntegrationTest;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Bất biến xoá clip: gửi nhiều clip mà một clip ghi lỗi thì giao dịch lùi lại, không còn dòng video_clips nào trỏ
 * tới các file đã ghi trước đó. ClipCleanupJob chỉ dọn theo dòng trong DB, nên file nào sót lại là nằm mãi.
 */
class ReviewSubmitCleanupIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private JdbcTemplate jdbc;
	@MockitoSpyBean
	private ClipStorage clipStorage;

	@Test
	void secondClipFailsToStore_firstClipFileRemovedAndNothingQueued() throws IOException {
		AuthedUser user = newAuthedUser(Role.USER);
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		doCallRealMethod()
				.doThrow(new UncheckedIOException("giả đĩa đầy", new IOException()))
				.when(clipStorage).store(any());
		Set<Path> before = clipFiles();

		var response = rest.exchange(
				"/api/v1/reviews?exerciseId=" + squatId + "&optIn=true&viewpoints=SAGITTAL&viewpoints=FRONTAL",
				HttpMethod.POST, twoClips(user.headers()), String.class);

		assertThat(response.getStatusCode().is5xxServerError()).isTrue();
		assertThat(clipFiles()).isEqualTo(before);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM video_review_requests WHERE user_id = ?",
				Long.class, user.userId())).isZero();
	}

	private Set<Path> clipFiles() throws IOException {
		try (Stream<Path> files = Files.walk(CLIP_ROOT)) {
			return files.filter(Files::isRegularFile).collect(Collectors.toSet());
		}
	}

	private HttpEntity<MultiValueMap<String, Object>> twoClips(HttpHeaders auth) {
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("clips", clip("sagittal.mp4"));
		body.add("clips", clip("frontal.mp4"));
		HttpHeaders headers = new HttpHeaders();
		headers.addAll(auth);
		headers.setContentType(MediaType.MULTIPART_FORM_DATA);
		return new HttpEntity<>(body, headers);
	}

	private ByteArrayResource clip(String filename) {
		return new ByteArrayResource("fake-clip-bytes".getBytes()) {
			@Override
			public String getFilename() {
				return filename;
			}
		};
	}
}
