package com.fitness.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * concept-backend-v1.md §5: JWT HMAC-SHA256, chứa sub=userId và role. CHỈ
 * phần cấp token — verify để Spring lo (oauth2ResourceServer, SecurityConfig).
 * Dùng Nimbus JOSE có sẵn qua spring-security-oauth2-jose, không thêm thư
 * viện JWT mới.
 */
@Component
public class JwtIssuer {

	// Doc gợi ý hạ xuống khi lên mobile/có tài khoản lộ — 15 phút là điểm khởi đầu hợp lý cho MVP có refresh token.
	static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
	private static final String ISSUER = "fitness-backend";

	private final MACSigner signer;

	public JwtIssuer(@Value("${app.jwt-secret}") String secret) {
		this.signer = createSigner(secret);
	}

	private static MACSigner createSigner(String secret) {
		try {
			return new MACSigner(secret.getBytes(StandardCharsets.UTF_8));
		} catch (com.nimbusds.jose.KeyLengthException e) {
			throw new IllegalStateException("app.jwt-secret (JWT_SECRET) phải dài tối thiểu 32 byte", e);
		}
	}

	public String issueAccessToken(UUID userId, Role role) {
		Instant now = Instant.now();
		JWTClaimsSet claims = new JWTClaimsSet.Builder()
				.subject(userId.toString())
				.claim("role", role.name())
				.issuer(ISSUER)
				.issueTime(Date.from(now))
				.expirationTime(Date.from(now.plus(ACCESS_TOKEN_TTL)))
				.build();
		SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
		try {
			jwt.sign(signer);
		} catch (com.nimbusds.jose.JOSEException e) {
			throw new IllegalStateException("Ký JWT thất bại", e);
		}
		return jwt.serialize();
	}
}
