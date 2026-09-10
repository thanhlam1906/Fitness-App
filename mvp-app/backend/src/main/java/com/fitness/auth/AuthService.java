package com.fitness.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Không kiểm invite_code — dự án chưa tới giai đoạn phát hành 100 tester
 * (ke-hoach-ky-thuat-v1.md P4), đăng ký tự do. Bảng invite_codes vẫn còn
 * trong schema, nối lại khi cần mà không phải thêm migration.
 */
@Service
public class AuthService {

	private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

	private final UserRepository users;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordEncoder passwordEncoder;
	private final JwtIssuer jwtIssuer;
	private final SecureRandom random = new SecureRandom();

	public AuthService(
			UserRepository users, RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
			JwtIssuer jwtIssuer) {
		this.users = users;
		this.refreshTokens = refreshTokens;
		this.passwordEncoder = passwordEncoder;
		this.jwtIssuer = jwtIssuer;
	}

	public AuthTokens register(String email, String password) {
		if (users.existsByEmail(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký");
		}
		User user = new User(email, passwordEncoder.encode(password), Role.USER);
		users.save(user);
		return issueTokens(user);
	}

	public AuthTokens login(String email, String password) {
		User user = users.findByEmail(email)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu"));
		if (!passwordEncoder.matches(password, user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
		}
		return issueTokens(user);
	}

	/** Rotation: token cũ bị revoke ngay khi dùng — dùng lại token đã revoke nghĩa là nó đã bị lộ. */
	public AuthTokens refresh(String refreshToken) {
		RefreshToken stored = refreshTokens.findByTokenHash(hash(refreshToken))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));
		if (!stored.isUsable()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn hoặc bị thu hồi");
		}
		stored.revoke();
		refreshTokens.save(stored);

		User user = users.findById(stored.getUserId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng"));
		return issueTokens(user);
	}

	public void logout(String refreshToken) {
		refreshTokens.findByTokenHash(hash(refreshToken)).ifPresent(rt -> {
			rt.revoke();
			refreshTokens.save(rt);
		});
	}

	private AuthTokens issueTokens(User user) {
		String accessToken = jwtIssuer.issueAccessToken(user.getId(), user.getRole());
		String refreshTokenRaw = generateOpaqueToken();
		refreshTokens.save(new RefreshToken(user.getId(), hash(refreshTokenRaw), Instant.now().plus(REFRESH_TOKEN_TTL)));
		return new AuthTokens(accessToken, refreshTokenRaw, user.getId(), user.getRole());
	}

	private String generateOpaqueToken() {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private String hash(String token) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return Base64.getEncoder().encodeToString(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
