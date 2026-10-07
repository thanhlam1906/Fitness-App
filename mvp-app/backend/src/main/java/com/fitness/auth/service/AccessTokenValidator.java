package com.fitness.auth.service;

import com.fitness.auth.entity.User;
import com.fitness.auth.repository.UserRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.stereotype.Component;

/**
 * doc/design-quan-ly-user-v1.md §4.1: JWT tự nó không biết tài khoản đã bị khoá hay phiên đã
 * bị thu hồi, nên mỗi request đọc lại user một lần. Ném InvalidBearerTokenException để Spring
 * trả 401; client thử refresh, refresh cũng hỏng thì đăng xuất — người bị khoá ra ngay.
 */
@Component
public class AccessTokenValidator {

	private final UserRepository users;

	public AccessTokenValidator(UserRepository users) {
		this.users = users;
	}

	public void check(UUID userId, Instant issuedAt) {
		User user = users.findById(userId)
				.orElseThrow(() -> new InvalidBearerTokenException("Tài khoản không còn tồn tại"));
		if (!user.isActive()) {
			throw new InvalidBearerTokenException("Tài khoản đã bị khoá");
		}
		if (issuedAt == null || issuedAt.isBefore(user.getTokensValidAfter())) {
			throw new InvalidBearerTokenException("Phiên đăng nhập đã bị thu hồi");
		}
	}
}
