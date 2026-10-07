package com.fitness.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.dto.LoginRequest;
import com.fitness.auth.dto.RefreshRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.support.PostgresIntegrationTest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

/** doc/design-quan-ly-user-v1.md §4: khoá và thu hồi phiên có hiệu lực ở request kế tiếp. */
class SessionIntegrationTest extends PostgresIntegrationTest {

	private static final String PASSWORD = "correct-password";

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;

	private record Registered(String email, TokenResponse tokens) {
	}

	private Registered register() {
		String email = "session+" + UUID.randomUUID() + "@example.com";
		TokenResponse tokens = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(email, PASSWORD, "Nguyễn Văn A", "0912345678"), TokenResponse.class).getBody();
		return new Registered(email, tokens);
	}

	private HttpStatus getProfile(String accessToken) {
		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth(accessToken);
		return (HttpStatus) rest.exchange("/api/v1/me/profile", HttpMethod.GET, new HttpEntity<>(headers), String.class)
				.getStatusCode();
	}

	@Test
	void tokenConHan_dungDuoc() {
		assertThat(getProfile(register().tokens().accessToken())).isEqualTo(HttpStatus.OK);
	}

	@Test
	void taiKhoanBiKhoa_tokenDangDung401_refresh401_login403() {
		Registered r = register();
		jdbc.update("update users set is_active = false where id = ?", r.tokens().userId());

		assertThat(getProfile(r.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
		var refresh = rest.postForEntity("/api/v1/auth/refresh",
				new RefreshRequest(r.tokens().refreshToken()), Map.class);
		assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		var login = rest.postForEntity("/api/v1/auth/login", new LoginRequest(r.email(), PASSWORD), Map.class);
		assertThat(login.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(login.getBody().get("message")).isEqualTo("Tài khoản đã bị khoá. Liên hệ quản trị viên.");
	}

	@Test
	void tokenCapTruocMoc_bi401() {
		Registered r = register();
		jdbc.update("update users set tokens_valid_after = now() + interval '1 minute' where id = ?",
				r.tokens().userId());

		assertThat(getProfile(r.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void matKhauTam_login403_khongCapToken() {
		Registered r = register();
		jdbc.update("update users set must_change_password = true where id = ?", r.tokens().userId());

		var login = rest.postForEntity("/api/v1/auth/login", new LoginRequest(r.email(), PASSWORD), Map.class);

		assertThat(login.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(login.getBody().get("message")).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		assertThat(login.getBody()).doesNotContainKey("accessToken");
	}

	@Test
	void taiKhoanBiXoa_token401() {
		Registered r = register();
		jdbc.update("delete from users where id = ?", r.tokens().userId());

		assertThat(getProfile(r.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
	}
}
