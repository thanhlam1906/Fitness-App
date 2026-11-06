package com.fitness.auth.service;

import com.fitness.auth.dto.ChangePasswordRequest;
import com.fitness.auth.dto.FirstLoginPasswordRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.SocialConfigResponse;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.entity.RefreshToken;
import com.fitness.auth.entity.Role;
import com.fitness.auth.entity.User;
import com.fitness.auth.repository.RefreshTokenRepository;
import com.fitness.auth.repository.UserRepository;
import com.fitness.common.RateLimits;
import com.fitness.profile.service.ProfileService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Không kiểm invite_code — dự án chưa tới giai đoạn phát hành 100 tester
 * (ke-hoach-ky-thuat-v1.md P4), đăng ký tự do. Bảng invite_codes vẫn còn
 * trong schema, nối lại khi cần mà không phải thêm migration.
 */
@Service
public class AuthService {

	/** LoginPage web/mobile bắt đúng chuỗi này để chuyển sang bước đặt mật khẩu mới. */
	public static final String PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED";
	static final String LOCKED_MESSAGE = "Tài khoản đã bị khoá. Liên hệ quản trị viên.";

	private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

	private final UserRepository users;
	private final ProfileService profileService;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordEncoder passwordEncoder;
	private final JwtIssuer jwtIssuer;
	private final RateLimits rateLimits;
	private final SocialTokenVerifier socialVerifier;
	private final TransactionTemplate transaction;
	private final SecureRandom random = new SecureRandom();

	public AuthService(
			UserRepository users, ProfileService profileService, RefreshTokenRepository refreshTokens,
			PasswordEncoder passwordEncoder, JwtIssuer jwtIssuer, RateLimits rateLimits,
			SocialTokenVerifier socialVerifier, TransactionTemplate transaction) {
		this.users = users;
		this.profileService = profileService;
		this.refreshTokens = refreshTokens;
		this.passwordEncoder = passwordEncoder;
		this.jwtIssuer = jwtIssuer;
		this.rateLimits = rateLimits;
		this.socialVerifier = socialVerifier;
		this.transaction = transaction;
	}

	/**
	 * User và hồ sơ ghi trong cùng transaction: lỗi ở bước nào thì cũng không để lại
	 * tài khoản thiếu thông tin đăng ký.
	 */
	@Transactional
	public TokenResponse register(RegisterRequest request, String clientIp) {
		rateLimits.check("register", clientIp);
		// @Size kiểm trước khi bỏ khoảng trắng, nên " a" lọt qua annotation — kiểm lại sau strip.
		String fullName = request.fullName().strip();
		if (fullName.length() < 2) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên không hợp lệ");
		}
		if (users.existsByEmail(request.email())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký");
		}
		User user = users.save(new User(request.email(), passwordEncoder.encode(request.password()), Role.USER));
		profileService.createForNewUser(user.getId(), fullName, request.phone());
		return issueTokens(user);
	}

	public TokenResponse login(String email, String password, String clientIp) {
		rateLimits.check("login-ip", clientIp);
		rateLimits.check("login", loginKey(email, clientIp));
		User user = users.findByEmail(email)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu"));
		if (!passwordEncoder.matches(password, user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
		}
		// Kiểm SAU mật khẩu: người không biết mật khẩu không dò được tài khoản nào đang bị khoá.
		if (!user.isActive()) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, LOCKED_MESSAGE);
		}
		if (user.isMustChangePassword()) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, PASSWORD_CHANGE_REQUIRED);
		}
		return issueTokens(user);
	}

	public SocialConfigResponse socialConfig() {
		return socialVerifier.config();
	}

	public TokenResponse googleLogin(String accessToken, String clientIp) {
		rateLimits.check("login-ip", clientIp);
		return socialLogin(socialVerifier.google(accessToken));
	}

	public TokenResponse facebookLogin(String accessToken, String clientIp) {
		rateLimits.check("login-ip", clientIp);
		return socialLogin(socialVerifier.facebook(accessToken));
	}

	/**
	 * Khớp theo email nhà cung cấp đã xác minh: trùng thì vào tài khoản cũ, chưa có thì tạo mới không số
	 * điện thoại (doc/design-dang-nhap-mxh-v1.md §1). Không @Transactional ở đây: không giữ transaction
	 * trong lúc chờ Google/Facebook, chỉ phần tạo user + hồ sơ chạy trong transaction.
	 */
	private TokenResponse socialLogin(SocialTokenVerifier.Identity identity) {
		User user = users.findByEmailIgnoreCase(identity.email()).orElseGet(() -> createSocialUser(identity));
		if (!user.isActive()) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, LOCKED_MESSAGE);
		}
		if (!user.isEmailVerified()) {
			user = claimUnverifiedAccount(user.getId());
		}
		// Không chặn must_change_password: mật khẩu tạm chỉ là chuyện mật khẩu, Google/Facebook đã chứng minh chủ email.
		return issueTokens(user);
	}

	/**
	 * Tài khoản đăng ký bằng mật khẩu chưa ai xác minh email: có thể kẻ khác đăng ký trước bằng email này. Chủ email
	 * thật thắng: thay mật khẩu bằng chuỗi ngẫu nhiên, thu hồi mọi phiên (người dùng chốt 11-06). Muốn dùng lại
	 * mật khẩu thì nhờ admin cấp mật khẩu tạm.
	 */
	private User claimUnverifiedAccount(UUID userId) {
		return transaction.execute(status -> {
			// Đọc lại và khoá dòng: user đọc lúc nãy đã tách khỏi phiên, merge nó sẽ ghi đè lệnh khoá admin vừa bấm.
			User user = users.lockById(userId).orElseThrow(
					() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng"));
			if (!user.isActive()) {
				throw new ResponseStatusException(HttpStatus.FORBIDDEN, LOCKED_MESSAGE);
			}
			// Tab khác vừa nhận xong thì không thu hồi lần nữa (sẽ đăng xuất chính tab đó).
			if (!user.isEmailVerified()) {
				user.setPassword(passwordEncoder.encode(generateOpaqueToken()), false);
				user.markEmailVerified();
				revokeSessions(user);
			}
			return user;
		});
	}

	private User createSocialUser(SocialTokenVerifier.Identity identity) {
		try {
			return transaction.execute(status -> {
				// Cột password_hash NOT NULL: băm một chuỗi ngẫu nhiên không ai biết, đăng nhập bằng mật khẩu không qua được.
				User created = new User(identity.email(), passwordEncoder.encode(generateOpaqueToken()), Role.USER);
				created.markEmailVerified();
				User user = users.save(created);
				profileService.createForNewUser(user.getId(), identity.name(), null);
				return user;
			});
		} catch (DataIntegrityViolationException e) {
			// Hai lần bấm cùng lúc: lần kia vừa tạo xong email này, dùng luôn tài khoản đó.
			return users.findByEmailIgnoreCase(identity.email()).orElseThrow(() -> e);
		}
	}

	/** Rotation: token cũ bị revoke ngay khi dùng — dùng lại token đã revoke nghĩa là nó đã bị lộ. */
	public TokenResponse refresh(String refreshToken) {
		RefreshToken stored = refreshTokens.findByTokenHash(hash(refreshToken))
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));
		if (!stored.isUsable()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn hoặc bị thu hồi");
		}
		stored.revoke();
		refreshTokens.save(stored);

		User user = users.findById(stored.getUserId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng"));
		if (!user.isActive()) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản đã bị khoá");
		}
		return issueTokens(user);
	}

	public void logout(String refreshToken) {
		refreshTokens.findByTokenHash(hash(refreshToken)).ifPresent(rt -> {
			rt.revoke();
			refreshTokens.save(rt);
		});
	}

	/**
	 * Khoá, đổi vai trò, đặt lại hay đổi mật khẩu: mọi access token đang lưu hành hỏng ở request
	 * kế tiếp (AccessTokenValidator) và mọi refresh token bị thu hồi. saveAndFlush để query JDBC
	 * cùng transaction (danh sách admin) thấy ngay thay đổi.
	 */
	@Transactional
	public void revokeSessions(User user) {
		user.invalidateTokens();
		refreshTokens.revokeAllForUser(user.getId(), Instant.now());
		users.saveAndFlush(user);
	}

	@Transactional
	public TokenResponse changePasswordAtLogin(FirstLoginPasswordRequest request, String clientIp) {
		rateLimits.check("login-ip", clientIp);
		rateLimits.check("login", loginKey(request.email(), clientIp));
		User user = users.findByEmail(request.email())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu"));
		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai email hoặc mật khẩu");
		}
		if (!user.isActive()) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, LOCKED_MESSAGE);
		}
		return applyNewPassword(user, request.currentPassword(), request.newPassword());
	}

	@Transactional
	public TokenResponse changePassword(UUID userId, ChangePasswordRequest request) {
		// Cùng mức với đăng nhập, đếm theo người: ai cầm được máy đang đăng nhập không đoán mật khẩu liên tục được.
		rateLimits.check("login", "user:" + userId);
		User user = users.findById(userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy người dùng"));
		if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
		}
		return applyNewPassword(user, request.currentPassword(), request.newPassword());
	}

	/** Thu hồi phiên TRƯỚC rồi mới cấp token mới — thiết bị đang đổi giữ được phiên, thiết bị khác bị đăng xuất. */
	private TokenResponse applyNewPassword(User user, String currentPassword, String newPassword) {
		if (currentPassword.equals(newPassword)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
		}
		user.setPassword(passwordEncoder.encode(newPassword), false);
		revokeSessions(user);
		return issueTokens(user);
	}

	/**
	 * Chung cho đăng nhập và đổi mật khẩu tạm: cả hai kiểm mật khẩu, tách bộ đếm thì kẻ dò chuyển sang
	 * đường kia. Chữ thường để "A@x.com" và "a@x.com" không thành hai bộ đếm.
	 */
	private static String loginKey(String email, String clientIp) {
		return email.toLowerCase(Locale.ROOT) + "|" + clientIp;
	}

	private TokenResponse issueTokens(User user) {
		String accessToken = jwtIssuer.issueAccessToken(user.getId(), user.getRole(), user.getTokensValidAfter());
		String refreshTokenRaw = generateOpaqueToken();
		refreshTokens.save(new RefreshToken(user.getId(), hash(refreshTokenRaw), Instant.now().plus(REFRESH_TOKEN_TTL)));
		return new TokenResponse(accessToken, refreshTokenRaw, user.getId(), user.getRole());
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
