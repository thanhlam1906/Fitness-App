package com.fitness.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.dto.LoginRequest;
import com.fitness.auth.dto.RefreshRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.entity.Role;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

class AuthControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	@Autowired
	private ProfileRepository profiles;

	private static String uniqueEmail() {
		return "auth+" + UUID.randomUUID() + "@example.com";
	}

	private static RegisterRequest registerRequest(String email, String password) {
		return new RegisterRequest(email, password, "Nguyễn Văn A", "0912345678");
	}

	@Test
	void register_savesProfileDetails() {
		var body = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(uniqueEmail(), "correct-password", "  Trần Thị B ", "+84912345678"),
				TokenResponse.class).getBody();

		Profile profile = profiles.findById(body.userId()).orElseThrow();
		assertThat(profile.getFullName()).isEqualTo("Trần Thị B");
		assertThat(profile.getPhone()).isEqualTo("+84912345678");
		// Năm sinh, giới tính hỏi ở onboarding, không phải lúc đăng ký.
		assertThat(profile.getBirthYear()).isNull();
		assertThat(profile.getOnboardingStep()).isEqualTo("DISCLAIMER");
	}

	@Test
	void register_invalidPhone_returns400() {
		var resp = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(uniqueEmail(), "correct-password", "Nguyễn Văn A", "12345"),
				java.util.Map.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void register_fullNameTooShortAfterStrip_returns400() {
		var resp = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(uniqueEmail(), "correct-password", " a", "0912345678"),
				java.util.Map.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void register_missingFullName_returns400() {
		var resp = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(uniqueEmail(), "correct-password", null, "0912345678"),
				java.util.Map.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void register_thenLogin_bothReturnUsableTokens() {
		String email = uniqueEmail();

		var registerResp = rest.postForEntity(
				"/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class);
		assertThat(registerResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(registerResp.getBody().accessToken()).isNotBlank();
		assertThat(registerResp.getBody().role()).isEqualTo(Role.USER);

		var loginResp = rest.postForEntity(
				"/api/v1/auth/login", new LoginRequest(email, "correct-password"), TokenResponse.class);
		assertThat(loginResp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(loginResp.getBody().userId()).isEqualTo(registerResp.getBody().userId());
	}

	@Test
	void register_duplicateEmail_returns409() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class);

		var second = rest.postForEntity(
				"/api/v1/auth/register", registerRequest(email, "another-password"), java.util.Map.class);

		assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void login_wrongPassword_returns401() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class);

		var resp = rest.postForEntity(
				"/api/v1/auth/login", new LoginRequest(email, "wrong-password"), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void refresh_rotatesToken_oldRefreshTokenNoLongerUsable() {
		String email = uniqueEmail();
		TokenResponse original = rest.postForEntity(
				"/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class).getBody();

		var refreshResp = rest.postForEntity(
				"/api/v1/auth/refresh", new RefreshRequest(original.refreshToken()), TokenResponse.class);
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
		TokenResponse tokens = rest.postForEntity(
				"/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class).getBody();

		var logoutResp = rest.postForEntity(
				"/api/v1/auth/logout", new RefreshRequest(tokens.refreshToken()), Void.class);
		assertThat(logoutResp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

		var afterLogout = rest.postForEntity(
				"/api/v1/auth/refresh", new RefreshRequest(tokens.refreshToken()), java.util.Map.class);
		assertThat(afterLogout.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	/**
	 * Người dùng còn token cũ trong máy vẫn phải đăng nhập lại được. Nếu /auth/**
	 * nằm chung chuỗi filter với oauth2ResourceServer thì header Bearer hỏng bị
	 * chặn 401 ngay ở tầng xác thực, và họ bị khoá ngoài cho tới khi tự xoá
	 * localStorage.
	 */
	@Test
	void login_withExpiredBearerHeader_stillWorks() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class);

		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth("eyJhbGciOiJIUzI1NiJ9.token-het-han.chu-ky-sai");

		var resp = rest.exchange(
				"/api/v1/auth/login", org.springframework.http.HttpMethod.POST,
				new HttpEntity<>(new LoginRequest(email, "correct-password"), headers), TokenResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().accessToken()).isNotBlank();
	}

	/** Token hỏng gửi tới endpoint CẦN đăng nhập thì vẫn phải bị chặn. */
	@Test
	void protectedEndpoint_withGarbageBearer_returns401() {
		HttpHeaders headers = new HttpHeaders();
		headers.setBearerAuth("eyJhbGciOiJIUzI1NiJ9.token-het-han.chu-ky-sai");

		var resp = rest.exchange(
				"/api/v1/me/profile", org.springframework.http.HttpMethod.GET,
				new HttpEntity<>(headers), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void protectedEndpoint_withoutToken_returns401() {
		var resp = rest.getForEntity("/api/v1/schedule", java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}
}
