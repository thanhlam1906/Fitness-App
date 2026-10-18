package com.fitness.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ApiExceptionHandlerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	// Gõ tay /form-check/bodyweight-squat từng làm màn lỗi in nguyên câu Java tiếng Anh của Spring.
	@Test
	void idKhongPhaiUuid_tra400CauTiengViet() {
		ResponseEntity<Map> res = rest.exchange("/api/v1/exercises/bodyweight-squat", HttpMethod.GET,
				authed(null, Role.USER), Map.class);

		assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(res.getBody()).containsEntry("message", "Đường dẫn không hợp lệ.");
	}

	@Test
	void queryKhongPhaiUuid_tra400CauTiengViet() {
		ResponseEntity<Map> res = rest.exchange("/api/v1/sessions?scheduledWorkoutId=abc", HttpMethod.GET,
				authed(null, Role.USER), Map.class);

		assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(res.getBody()).containsEntry("message", "Yêu cầu không hợp lệ.");
	}
}
