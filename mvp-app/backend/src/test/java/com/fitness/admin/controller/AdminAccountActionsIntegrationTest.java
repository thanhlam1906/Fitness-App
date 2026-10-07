package com.fitness.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.admin.dto.AdminAuditLogResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.dto.AdminTemporaryPasswordResponse;
import com.fitness.admin.dto.AdminUserCreateRequest;
import com.fitness.admin.dto.AdminUserCreatedResponse;
import com.fitness.admin.dto.AdminUserDeleteRequest;
import com.fitness.admin.dto.AdminUserRoleRequest;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.admin.dto.AdminUserStatusRequest;
import com.fitness.auth.dto.FirstLoginPasswordRequest;
import com.fitness.auth.dto.LoginRequest;
import com.fitness.auth.dto.RefreshRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.entity.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

/** doc/design-quan-ly-user-v1.md §5.5–5.6. */
class AdminAccountActionsIntegrationTest extends PostgresIntegrationTest {

	private static final String PASSWORD = "correct-password";
	private static final ParameterizedTypeReference<AdminPageResponse<AdminAuditLogResponse>> AUDIT =
			new ParameterizedTypeReference<>() {
			};

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;

	private record Registered(String email, TokenResponse tokens) {
		UUID id() {
			return tokens.userId();
		}
	}

	private Registered register() {
		String email = "acct+" + UUID.randomUUID() + "@example.com";
		return new Registered(email, rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(email, PASSWORD, "Nguyễn Văn A", "0912345678"), TokenResponse.class).getBody());
	}

	private HttpStatus profileStatus(String token) {
		HttpHeaders h = new HttpHeaders();
		h.setBearerAuth(token);
		return (HttpStatus) rest.exchange("/api/v1/me/profile", HttpMethod.GET, new HttpEntity<>(h), String.class)
				.getStatusCode();
	}

	private <T> org.springframework.http.ResponseEntity<T> call(
			HttpMethod method, String path, Object body, HttpHeaders admin, Class<T> type) {
		return rest.exchange("/api/v1/admin" + path, method, new HttpEntity<>(body, admin), type);
	}

	private List<AdminAuditLogResponse> audit(HttpHeaders admin, UUID targetId) {
		return rest.exchange("/api/v1/admin/audit?targetId=" + targetId, HttpMethod.GET, new HttpEntity<>(admin), AUDIT)
				.getBody().items();
	}

	@Test
	void khoa_tokenDangDung401_moKhoa_dangNhapLaiDuoc_nhatKyHaiDong() {
		Registered target = register();
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var locked = call(HttpMethod.PATCH, "/users/" + target.id() + "/status",
				new AdminUserStatusRequest(false, "Spam"), admin, AdminUserRowResponse.class);
		assertThat(locked.getBody().status()).isEqualTo("LOCKED");
		assertThat(profileStatus(target.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
		// Refresh token cũ cũng phải chết, không thì người bị khoá tự xin access token mới.
		assertThat(rest.postForEntity("/api/v1/auth/refresh", new RefreshRequest(target.tokens().refreshToken()),
				Map.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

		call(HttpMethod.PATCH, "/users/" + target.id() + "/status", new AdminUserStatusRequest(true, null), admin,
				AdminUserRowResponse.class);
		assertThat(rest.postForEntity("/api/v1/auth/login", new LoginRequest(target.email(), PASSWORD),
				TokenResponse.class).getStatusCode()).isEqualTo(HttpStatus.OK);

		assertThat(audit(admin, target.id())).extracting(AdminAuditLogResponse::action)
				.containsExactly("UNLOCK", "LOCK");
		assertThat(audit(admin, target.id()).get(1).reason()).isEqualTo("Spam");
	}

	@Test
	void khoaKhongLyDo_400_khoaLai_khongGhiThem() {
		Registered target = register();
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		assertThat(call(HttpMethod.PATCH, "/users/" + target.id() + "/status", new AdminUserStatusRequest(false, "  "),
				admin, Map.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

		call(HttpMethod.PATCH, "/users/" + target.id() + "/status", new AdminUserStatusRequest(false, "Lý do"), admin,
				AdminUserRowResponse.class);
		call(HttpMethod.PATCH, "/users/" + target.id() + "/status", new AdminUserStatusRequest(false, "Lần hai"), admin,
				AdminUserRowResponse.class);
		assertThat(audit(admin, target.id())).hasSize(1);
	}

	@Test
	void doiVaiTro_tokenCu401_dangNhapLaiCoVaiTroMoi() {
		Registered target = register();
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var resp = call(HttpMethod.PATCH, "/users/" + target.id() + "/role", new AdminUserRoleRequest(Role.ADMIN),
				admin, AdminUserRowResponse.class);

		assertThat(resp.getBody().role()).isEqualTo("ADMIN");
		assertThat(profileStatus(target.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
		TokenResponse again = rest.postForEntity("/api/v1/auth/login", new LoginRequest(target.email(), PASSWORD),
				TokenResponse.class).getBody();
		assertThat(again.role()).isEqualTo(Role.ADMIN);
		assertThat(audit(admin, target.id()).get(0).detail()).containsEntry("from", "USER").containsEntry("to", "ADMIN");
	}

	@Test
	void datLaiMatKhau_login403_doiXongDangNhapDuoc() {
		Registered target = register();
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		String temp = call(HttpMethod.POST, "/users/" + target.id() + "/reset-password", null, admin,
				AdminTemporaryPasswordResponse.class).getBody().temporaryPassword();

		assertThat(temp).hasSize(12).doesNotContainAnyWhitespaces();
		assertThat(profileStatus(target.tokens().accessToken())).isEqualTo(HttpStatus.UNAUTHORIZED);
		var login = rest.postForEntity("/api/v1/auth/login", new LoginRequest(target.email(), temp), Map.class);
		assertThat(login.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(login.getBody().get("message")).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		assertThat(rest.postForEntity("/api/v1/auth/change-password",
				new FirstLoginPasswordRequest(target.email(), temp, "brand-new-pass"), TokenResponse.class)
				.getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void taoTaiKhoan_201_phaiDoiMatKhau_emailTrung409() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		String email = "created+" + UUID.randomUUID() + "@example.com";

		var created = call(HttpMethod.POST, "/users", new AdminUserCreateRequest("  Lê Văn C ", email, null, Role.USER),
				admin, AdminUserCreatedResponse.class);

		assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(created.getBody().user().fullName()).isEqualTo("Lê Văn C");
		var login = rest.postForEntity("/api/v1/auth/login",
				new LoginRequest(email, created.getBody().temporaryPassword()), Map.class);
		assertThat(login.getBody().get("message")).isEqualTo("PASSWORD_CHANGE_REQUIRED");
		assertThat(call(HttpMethod.POST, "/users", new AdminUserCreateRequest("Lê Văn C", email, null, Role.USER),
				admin, Map.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(audit(admin, created.getBody().user().id())).extracting(AdminAuditLogResponse::action)
				.containsExactly("CREATE");
	}

	@Test
	void xoa_matUserVaDuLieu_nhatKyCon_fileClipBiXoa() throws Exception {
		Registered target = register();
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		jdbc.update("insert into workout_sessions (user_id, status) values (?, 'DONE')", target.id());
		UUID exerciseId = jdbc.queryForObject("select id from exercises limit 1", UUID.class);
		UUID requestId = jdbc.queryForObject(
				"insert into video_review_requests (user_id, exercise_id) values (?, ?) returning id",
				UUID.class, target.id(), exerciseId);
		String key = "clips/test/" + UUID.randomUUID() + ".mp4";
		Path file = CLIP_ROOT.resolve(key);
		Files.createDirectories(file.getParent());
		Files.writeString(file, "x");
		jdbc.update("insert into video_clips (request_id, storage_key) values (?, ?)", requestId, key);

		assertThat(call(HttpMethod.DELETE, "/users/" + target.id(), new AdminUserDeleteRequest(null), admin, Map.class)
				.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		var resp = call(HttpMethod.DELETE, "/users/" + target.id(), new AdminUserDeleteRequest("Yêu cầu xoá dữ liệu"),
				admin, Void.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		assertThat(jdbc.queryForObject("select count(*) from users where id = ?", Long.class, target.id())).isZero();
		assertThat(jdbc.queryForObject("select count(*) from workout_sessions where user_id = ?", Long.class,
				target.id())).isZero();
		assertThat(Files.exists(file)).isFalse();
		Map<String, Object> log = jdbc.queryForMap(
				"select target_id, target_email, reason from admin_audit_log where action = 'DELETE' and target_email = ?",
				target.email());
		assertThat(log.get("target_id")).isNull();
		assertThat(log.get("reason")).isEqualTo("Yêu cầu xoá dữ liệu");
	}

	@Test
	void tuThaoTacLenChinhMinh_400() {
		var me = newAuthedUser(Role.ADMIN);
		String base = "/users/" + me.userId();

		assertThat(call(HttpMethod.PATCH, base + "/status", new AdminUserStatusRequest(false, "x"), me.headers(),
				Map.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(call(HttpMethod.PATCH, base + "/role", new AdminUserRoleRequest(Role.USER), me.headers(),
				Map.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(call(HttpMethod.POST, base + "/reset-password", null, me.headers(), Map.class).getStatusCode())
				.isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(call(HttpMethod.DELETE, base, new AdminUserDeleteRequest("x"), me.headers(), Map.class)
				.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void nguoiTapGoiApiQuanTri_403() {
		Registered target = register();
		HttpHeaders user = newAuthedUser(Role.USER).headers();

		assertThat(call(HttpMethod.PATCH, "/users/" + target.id() + "/status", new AdminUserStatusRequest(false, "x"),
				user, Map.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(rest.exchange("/api/v1/admin/audit", HttpMethod.GET, new HttpEntity<>(user), String.class)
				.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}
}
