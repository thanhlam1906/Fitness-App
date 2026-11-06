package com.fitness.auth.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fitness.auth.dto.LoginRequest;
import com.fitness.auth.dto.RefreshRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.SocialConfigResponse;
import com.fitness.auth.dto.SocialLoginRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.entity.Role;
import com.fitness.auth.repository.UserRepository;
import com.fitness.auth.service.SocialTokenVerifier;
import com.fitness.auth.service.SocialTokenVerifier.Identity;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

/** Phần hỏi Google/Facebook đã có SocialTokenVerifierTest; ở đây giả verifier để kiểm tạo và liên kết tài khoản. */
class SocialLoginIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	@Autowired
	private ProfileRepository profiles;

	@Autowired
	private UserRepository users;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@MockitoBean
	private SocialTokenVerifier verifier;

	private static String uniqueEmail() {
		return "social+" + UUID.randomUUID() + "@example.com";
	}

	private ResponseEntity<TokenResponse> google(String email, String name) {
		when(verifier.google("tok")).thenReturn(new Identity(email, name));
		return rest.postForEntity("/api/v1/auth/google", new SocialLoginRequest("tok"), TokenResponse.class);
	}

	@Test
	void newEmail_createsUserWithProfile_withoutPhone_andGoesToOnboarding() {
		String email = uniqueEmail();

		var resp = google(email, "Nguyễn Văn A");

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().role()).isEqualTo(Role.USER);
		assertThat(resp.getBody().accessToken()).isNotBlank();
		Profile profile = profiles.findById(resp.getBody().userId()).orElseThrow();
		assertThat(profile.getFullName()).isEqualTo("Nguyễn Văn A");
		assertThat(profile.getPhone()).isNull();
		assertThat(profile.getOnboardingStep()).isEqualTo("DISCLAIMER");
	}

	@Test
	void existingPasswordAccount_firstSocialLogin_sameAccount_oldPasswordAndSessionsRevoked() {
		String email = uniqueEmail();
		var registered = rest.postForEntity("/api/v1/auth/register",
				new RegisterRequest(email, "correct-password", "Tên Cũ", "0912345678"), TokenResponse.class).getBody();

		// Google trả email khác hoa thường: vẫn khớp đúng tài khoản cũ.
		var resp = google(email.toUpperCase(), "Tên Google");

		assertThat(resp.getBody().userId()).isEqualTo(registered.userId());
		assertThat(profiles.findById(registered.userId()).orElseThrow().getFullName()).isEqualTo("Tên Cũ");
		// Người đăng ký trước có thể không phải chủ email: mật khẩu và phiên của họ mất hiệu lực.
		var login = rest.postForEntity("/api/v1/auth/login", new LoginRequest(email, "correct-password"), Map.class);
		assertThat(login.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		var refresh = rest.postForEntity("/api/v1/auth/refresh",
				new RefreshRequest(registered.refreshToken()), Map.class);
		assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		// Token vừa cấp cho người đăng nhập Google vẫn dùng được.
		var again = rest.postForEntity("/api/v1/auth/refresh",
				new RefreshRequest(resp.getBody().refreshToken()), TokenResponse.class);
		assertThat(again.getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void verifiedAccount_laterSocialLogin_keepsOtherSessions() {
		String email = uniqueEmail();
		var first = google(email, "A").getBody();

		google(email, "A");

		var refresh = rest.postForEntity("/api/v1/auth/refresh", new RefreshRequest(first.refreshToken()), TokenResponse.class);
		assertThat(refresh.getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void secondSocialLogin_doesNotCreateAnotherAccount() {
		String email = uniqueEmail();
		UUID first = google(email, "A").getBody().userId();

		when(verifier.facebook("tok")).thenReturn(new Identity(email, "A"));
		var resp = rest.postForEntity("/api/v1/auth/facebook", new SocialLoginRequest("tok"), TokenResponse.class);

		assertThat(resp.getBody().userId()).isEqualTo(first);
	}

	@Test
	void lockedAccount_is403() {
		String email = uniqueEmail();
		UUID id = google(email, "A").getBody().userId();
		var user = users.findById(id).orElseThrow();
		user.setActive(false);
		users.save(user);

		when(verifier.google("tok")).thenReturn(new Identity(email, "A"));
		var resp = rest.postForEntity("/api/v1/auth/google", new SocialLoginRequest("tok"), Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void temporaryPassword_doesNotBlockSocialLogin() {
		String email = uniqueEmail();
		UUID id = google(email, "A").getBody().userId();
		var user = users.findById(id).orElseThrow();
		user.setPassword(passwordEncoder.encode("tam-thoi-123"), true);
		users.save(user);

		assertThat(google(email, "A").getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void verifierRejects_statusPassesThrough() {
		when(verifier.google(anyString()))
				.thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "sai"));

		var resp = rest.postForEntity("/api/v1/auth/google", new SocialLoginRequest("bad"), Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	@Test
	void blankToken_is400() {
		var resp = rest.postForEntity("/api/v1/auth/google", new SocialLoginRequest(" "), Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void socialConfig_isPublic() {
		when(verifier.config()).thenReturn(new SocialConfigResponse("gid", null));

		var resp = rest.getForEntity("/api/v1/auth/social-config", SocialConfigResponse.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody()).isEqualTo(new SocialConfigResponse("gid", null));
	}
}
