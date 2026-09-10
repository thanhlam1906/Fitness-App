package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Lịch tự thiết kế: Program không gắn template nào. */
class CustomProgramIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProgramRepository programs;

	@Test
	void current_programWithoutTemplate_returnsCustomLabelInsteadOfFailing() {
		var user = newAuthedUser(Role.USER);
		programs.save(new Program(user.userId(), null, "{}", new Short[0], LocalDate.now()));

		var resp = rest.exchange("/api/v1/programs/current", HttpMethod.GET,
				new HttpEntity<>(user.headers()), CurrentProgramResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().templateId()).isNull();
		assertThat(resp.getBody().templateName()).isEqualTo("Lịch tự thiết kế");
	}
}
