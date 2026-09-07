package com.fitness.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.support.PostgresIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;

class AuthControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	private static String uniqueEmail() {
		return "auth+" + UUID.randomUUID() + "@example.com";
	}

	@Test
	void register_thenLogin_bothReturnUsableTokens() {
		String email = uniqueEmail();

		var registerResp = rest.postForEntity(
				"/api/v1/auth/register", new RegisterRequest(email, "correct-password"), AuthTokens.class);
		assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(registerResp.getBody().accessToken()).isNotBlank();
		assertThat(registerResp.getBody().role()).isEqualTo(Role.USER);

		var loginResp = rest.postForEntity(
				"/api/v1/auth/login", new LoginRequest(email, "correct-password"), AuthTokens.class);
		assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(loginResp.getBody().userId()).isEqualTo(registerResp.getBody().userId());
	}

	@Test
	void register_duplicateEmail_returns409() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", new RegisterRequest(email, "correct-password"), AuthTokens.class);

		var second = rest.postForEntity(
				"/api/v1/auth/register", new RegisterRequest(email, "another-password"), java.util.Map.class);

		assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void login_wrongPassword_returns401() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", new RegisterRequest(email, "correct-password"), AuthTokens.class);

		var resp = rest.postForEntity(
				"/api/v1/auth/login", new LoginRequest(email, "wrong-password"), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void refresh_rotatesToken_oldRefreshTokenNoLongerUsable() {
		String email = uniqueEmail();
		AuthTokens original = rest.postForEntity(
				"/api/v1/auth/register", new RegisterRequest(email, "correct-password"), AuthTokens.class).getBody();

		var refreshResp = rest.postForEntity(
				"/api/v1/auth/refresh", new RefreshRequest(original.refreshToken()), AuthTokens.class);
		assertThat(refreshResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(refreshResp.getBody().refreshToken()).isNotEqualTo(original.refreshToken());

		// token cũ đã bị revoke ngay khi rotate — dùng lại phải bị từ chối
		var reuseResp = rest.postForEntity(
				"/api/v1/auth/refresh", new RefreshRequest(original.refreshToken()), java.util.Map.class);
		assertThat(reuseResp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void logout_revokesRefreshToken() {
		String email = uniqueEmail();
		AuthTokens tokens = rest.postForEntity(
				"/api/v1/auth/register", new RegisterRequest(email, "correct-password"), AuthTokens.class).getBody();

		var logoutResp = rest.postForEntity(
				"/api/v1/auth/logout", new RefreshRequest(tokens.refreshToken()), Void.class);
		assertThat(logoutResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

		var afterLogout = rest.postForEntity(
				"/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), java.util.Map.class);
		assertThat(afterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void protectedEndpoint_withoutToken_returns401() {
		var resp = rest.getForEntity("/api/v1/schedule", java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}
}
