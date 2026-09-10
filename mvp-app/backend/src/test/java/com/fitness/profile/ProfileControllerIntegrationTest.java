package com.fitness.profile;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** A2–A6 §4 ke-hoach-chi-tiet-chuc-nang-v1.md — onboarding lưu từng bước, bỏ dở quay lại tiếp được. */
class ProfileControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	@Test
	void onboarding_savesStepByStep_andResumes() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();

		// Chưa có dòng profiles: trả hồ sơ rỗng ở bước đầu, KHÔNG 404 — nếu 404 thì
		// màn onboarding không biết mở ở bước nào.
		var initial = get(headers);
		assertThat(initial.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(initial.getBody().onboardingStep()).isEqualTo("DISCLAIMER");
		assertThat(initial.getBody().disclaimerAt()).isNull();

		patch(headers, new ProfilePatchRequest(null, null, null, null, null, null, true, "BODY"));
		patch(headers, new ProfilePatchRequest(null, null, null, null, (short) 1995, "F", null, "GOAL"));
		patch(headers, new ProfilePatchRequest("MUSCLE", null, null, null, null, null, null, "EQUIPMENT"));
		patch(headers, new ProfilePatchRequest(
				null, null, null, List.of("BARBELL_RACK", "BENCH"), null, null, null, "EXPERIENCE"));
		var last = patch(headers, new ProfilePatchRequest("MUSCLE", "LT_1Y", (short) 4, null, null, null, null, "DONE"));

		// Bước sau không được xoá dữ liệu bước trước (null = giữ nguyên).
		assertThat(last.getBody().goal()).isEqualTo("MUSCLE");
		assertThat(last.getBody().birthYear()).isEqualTo((short) 1995);
		assertThat(last.getBody().equipment()).containsExactlyInAnyOrder("BARBELL_RACK", "BENCH");
		assertThat(last.getBody().sessionsPerWeek()).isEqualTo((short) 4);
		assertThat(last.getBody().disclaimerAt()).isNotNull();
		assertThat(last.getBody().onboardingStep()).isEqualTo("DONE");
	}

	@Test
	void bodyMetrics_sameDayOverwrites_andShowsAsLatest() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();

		post(headers, new BodyMetricRequest(new BigDecimal("172.0"), new BigDecimal("70.00"), null));
		post(headers, new BodyMetricRequest(null, new BigDecimal("69.50"), null));

		var profile = get(headers).getBody();
		assertThat(profile.latestBodyMetric().weightKg()).isEqualByComparingTo("69.50");
		// heightCm không gửi lần hai → giữ nguyên, không bị xoá
		assertThat(profile.latestBodyMetric().heightCm()).isEqualByComparingTo("172.0");
	}

	@Test
	void sessionsPerWeek_outOfRange_rejected() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();
		var resp = rest.exchange("/api/v1/me/profile", HttpMethod.PATCH,
				new HttpEntity<>(new ProfilePatchRequest(null, null, (short) 9, null, null, null, null, null), headers),
				String.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	private org.springframework.http.ResponseEntity<ProfileResponse> get(HttpHeaders headers) {
		return rest.exchange("/api/v1/me/profile", HttpMethod.GET, new HttpEntity<>(headers), ProfileResponse.class);
	}

	private org.springframework.http.ResponseEntity<ProfileResponse> patch(
			HttpHeaders headers, ProfilePatchRequest body) {
		var resp = rest.exchange("/api/v1/me/profile", HttpMethod.PATCH,
				new HttpEntity<>(body, headers), ProfileResponse.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		return resp;
	}

	private void post(HttpHeaders headers, BodyMetricRequest body) {
		var resp = rest.exchange("/api/v1/me/body-metrics", HttpMethod.POST,
				new HttpEntity<>(body, headers), Void.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
	}
}
