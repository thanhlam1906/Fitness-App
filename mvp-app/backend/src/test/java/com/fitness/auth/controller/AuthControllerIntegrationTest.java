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

	@Test
	void dangNhapLan6CungEmailIp_bi429_keCaKhiDoiChuHoa_emailKhacVanVao() {
		String email = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", registerRequest(email, "correct-password"), TokenResponse.class);
		for (int i = 0; i < 5; i++) {
			assertThat(rest.postForEntity("/api/v1/auth/login", new LoginRequest(email, "wrong-password"),
					java.util.Map.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		}

		// Đổi chữ hoa không lách được bộ đếm, kể cả khi gõ đúng mật khẩu.
		var blocked = rest.postForEntity("/api/v1/auth/login",
				new LoginRequest(email.toUpperCase(java.util.Locale.ROOT), "correct-password"), java.util.Map.class);
		assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
		assertThat(blocked.getBody().get("message")).isEqualTo("Bạn thử quá nhiều lần, chờ 1 phút rồi thử lại.");

		String other = uniqueEmail();
		rest.postForEntity("/api/v1/auth/register", registerRequest(other, "correct-password"), TokenResponse.class);
		assertThat(rest.postForEntity("/api/v1/auth/login", new LoginRequest(other, "correct-password"),
				TokenResponse.class).getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	/** Sau Caddy mọi request tới từ IP của Caddy: phải đếm theo X-Forwarded-For, không thì chặn một người là chặn cả. */
	@Test
	void dangKyLan31CungIp_bi429_ipKhacVanDangKyDuoc() {
		for (int i = 0; i < 30; i++) {
			// Tên chỉ còn 1 chữ sau khi bỏ khoảng trắng: qua @Valid, service đếm rồi mới từ chối (400),
			// khỏi tốn 30 lần băm mật khẩu.
			assertThat(registerFrom("203.0.113.7",
					new RegisterRequest(uniqueEmail(), "correct-password", " a", "0912345678")).getStatusCode())
					.isEqualTo(HttpStatus.BAD_REQUEST);
		}

		var blocked = registerFrom("203.0.113.7", registerRequest(uniqueEmail(), "correct-password"));
		assertThat(blocked.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
		assertThat(blocked.getBody().get("message")).isEqualTo("Mạng này đăng ký quá nhiều lần, thử lại sau.");

		assertThat(registerFrom("203.0.113.8", registerRequest(uniqueEmail(), "correct-password")).getStatusCode())
				.isEqualTo(HttpStatus.CREATED);
	}

	/** Email thành tên bộ đếm giữ trong RAM tới lượt xoá mỗi giờ: chuỗi dài phải bị chặn từ @Valid. */
	@Test
	void dangNhapEmailQua254KyTu_bi400_khongTaoBoDem() {
		var resp = rest.postForEntity("/api/v1/auth/login",
				new LoginRequest("a".repeat(250) + "@x.com", "correct-password"), java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@SuppressWarnings("rawtypes")
	private org.springframework.http.ResponseEntity<java.util.Map> registerFrom(String ip, RegisterRequest request) {
		HttpHeaders headers = new HttpHeaders();
		headers.set("X-Forwarded-For", ip);
		return rest.exchange("/api/v1/auth/register", org.springframework.http.HttpMethod.POST,
				new HttpEntity<>(request, headers), java.util.Map.class);
	}
}
