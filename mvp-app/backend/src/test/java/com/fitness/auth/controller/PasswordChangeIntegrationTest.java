package com.fitness.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.dto.ChangePasswordRequest;
import com.fitness.auth.dto.FirstLoginPasswordRequest;
import com.fitness.auth.dto.LoginRequest;
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

/** doc/design-quan-ly-user-v1.md §4.4. */
class PasswordChangeIntegrationTest extends PostgresIntegrationTest {

	private static final String OLD = "old-password-1";
	private static final String NEW = "new-password-2";

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;

	private record Registered(String email, TokenResponse tokens) {
	}

	private Registered register() {
		String email = "pw+" + UUID.randomUUID() + "@example.com";
		return new Registered(email, rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(email, OLD, "Nguyễn Văn A", "0912345678"), TokenResponse.class).getBody());
	}

	private HttpHeaders bearer(String token) {
		HttpHeaders h = new HttpHeaders();
		h.setBearerAuth(token);
		return h;
	}

	private HttpStatus profileStatus(String token) {
		return (HttpStatus) rest.exchange("/api/v1/me/profile", HttpMethod.GET, new HttpEntity<>(bearer(token)),
				String.class).getStatusCode();
	}

	@Test
	void tuDoi_dung_tokenCuHong_tokenMoiDung_loginMatKhauMoi() {
		Registered r = register();

		var resp = rest.exchange("/api/v1/me/password", HttpMethod.PUT,
				new HttpEntity<>(new ChangePasswordRequest(OLD, NEW), bearer(r.tokens().accessToken())),
				TokenResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(profileStatus(r.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(profileStatus(resp.getBody().accessToken())).isEqualTo(HttpStatus.OK);
		assertThat(rest.postForEntity("/api/v1/auth/login", new LoginRequest(r.email(), NEW), TokenResponse.class)
				.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(rest.postForEntity("/api/v1/auth/login", new LoginRequest(r.email(), OLD), Map.class)
				.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void tuDoi_saiMatKhauHienTai_400() {
		Registered r = register();

		var resp = rest.exchange("/api/v1/me/password", HttpMethod.PUT,
				new HttpEntity<>(new ChangePasswordRequest("wrong-password", NEW), bearer(r.tokens().accessToken())),
				Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resp.getBody().get("message")).isEqualTo("Mật khẩu hiện tại không đúng");
	}

	@Test
	void tuDoi_trungMatKhauCu_400() {
		Registered r = register();

		var resp = rest.exchange("/api/v1/me/password", HttpMethod.PUT,
				new HttpEntity<>(new ChangePasswordRequest(OLD, OLD), bearer(r.tokens().accessToken())), Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resp.getBody().get("message")).isEqualTo("Mật khẩu mới phải khác mật khẩu hiện tại");
	}

	@Test
	void tuDoi_matKhauMoiNgan_400() {
		Registered r = register();

		var resp = rest.exchange("/api/v1/me/password", HttpMethod.PUT,
				new HttpEntity<>(new ChangePasswordRequest(OLD, "short"), bearer(r.tokens().accessToken())), Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void matKhauTam_doiLucDangNhap_capToken_hetCo() {
		Registered r = register();
		jdbc.update("update users set must_change_password = true where id = ?", r.tokens().userId());

		var resp = rest.postForEntity("/api/v1/auth/change-password",
				new FirstLoginPasswordRequest(r.email(), OLD, NEW), TokenResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(profileStatus(resp.getBody().accessToken())).isEqualTo(HttpStatus.OK);
		assertThat(jdbc.queryForObject("select must_change_password from users where id = ?", Boolean.class,
				r.tokens().userId())).isFalse();
	}

	@Test
	void doiLucDangNhap_saiMatKhau_401_taiKhoanKhoa_403() {
		Registered r = register();
		assertThat(rest.postForEntity("/api/v1/auth/change-password",
				new FirstLoginPasswordRequest(r.email(), "wrong-password", NEW), Map.class).getStatusCode())
				.isEqualTo(HttpStatus.UNAUTHORIZED);

		jdbc.update("update users set is_active = false where id = ?", r.tokens().userId());
		assertThat(rest.postForEntity("/api/v1/auth/change-password",
				new FirstLoginPasswordRequest(r.email(), OLD, NEW), Map.class).getStatusCode())
				.isEqualTo(HttpStatus.FORBIDDEN);
	}
}
