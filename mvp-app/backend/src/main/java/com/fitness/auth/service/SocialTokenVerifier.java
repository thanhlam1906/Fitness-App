package com.fitness.auth.service;

import com.fitness.auth.dto.SocialConfigResponse;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Hỏi lại Google/Facebook xem access token web gửi lên có thật, có cấp cho ĐÚNG app VFit không
 * (doc/design-dang-nhap-mxh-v1.md §3). Không kiểm app nhận token thì một trang lạ có nút "Đăng nhập Google"
 * lấy được token của người dùng rồi đem sang đây đăng nhập thay họ.
 */
@Component
public class SocialTokenVerifier {

	public record Identity(String email, String name) {
	}

	private static final String INVALID = "Phiên đăng nhập Google/Facebook không hợp lệ, thử lại";

	private final RestClient http;
	private final String googleClientId;
	private final String facebookAppId;
	private final String facebookAppSecret;

	/** Builder của Boot mang sẵn timeout ở spring.http.client, nhà cung cấp treo thì không treo luồng. */
	public SocialTokenVerifier(
			RestClient.Builder builder,
			@Value("${app.oauth.google-client-id:}") String googleClientId,
			@Value("${app.oauth.facebook-app-id:}") String facebookAppId,
			@Value("${app.oauth.facebook-app-secret:}") String facebookAppSecret) {
		this.http = builder.build();
		this.googleClientId = googleClientId;
		this.facebookAppId = facebookAppId;
		this.facebookAppSecret = facebookAppSecret;
	}

	/** null = chưa cấu hình, web giữ nút "Sắp có". Facebook cần cả secret mới xác minh được. */
	public SocialConfigResponse config() {
		return new SocialConfigResponse(
				googleClientId.isBlank() ? null : googleClientId,
				facebookAppId.isBlank() || facebookAppSecret.isBlank() ? null : facebookAppId);
	}

	public Identity google(String accessToken) {
		if (config().googleClientId() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa bật đăng nhập bằng Google");
		}
		Map<?, ?> info = call("Google", () -> http.get()
				.uri("https://oauth2.googleapis.com/tokeninfo?access_token={t}", accessToken)
				.retrieve().body(Map.class));
		if (!googleClientId.equals(info.get("aud"))) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
		}
		// Google trả email_verified lúc là chuỗi "true", lúc là boolean.
		String email = text(info.get("email"));
		if (email == null || !"true".equals(String.valueOf(info.get("email_verified")))) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email Google chưa được xác minh");
		}
		Map<?, ?> user = call("Google", () -> http.get()
				.uri("https://openidconnect.googleapis.com/v1/userinfo")
				.header("Authorization", "Bearer " + accessToken)
				.retrieve().body(Map.class));
		return new Identity(email, nameOr(user.get("name"), email));
	}

	public Identity facebook(String accessToken) {
		if (config().facebookAppId() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chưa bật đăng nhập bằng Facebook");
		}
		Map<?, ?> debug = call("Facebook", () -> http.get()
				.uri("https://graph.facebook.com/debug_token?input_token={t}&access_token={app}",
						accessToken, facebookAppId + "|" + facebookAppSecret)
				.retrieve().body(Map.class));
		Map<?, ?> data = debug.get("data") instanceof Map<?, ?> d ? d : Map.of();
		if (!Boolean.TRUE.equals(data.get("is_valid")) || !facebookAppId.equals(text(data.get("app_id")))) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
		}
		// appsecret_proof: token bị lộ cũng không gọi Graph API được nếu không có secret của app.
		Map<?, ?> me = call("Facebook", () -> http.get()
				.uri("https://graph.facebook.com/me?fields=name,email&access_token={t}&appsecret_proof={p}",
						accessToken, hmacSha256Hex(facebookAppSecret, accessToken))
				.retrieve().body(Map.class));
		String email = text(me.get("email"));
		if (email == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Tài khoản Facebook này không có email. Hãy đăng ký bằng email.");
		}
		return new Identity(email, nameOr(me.get("name"), email));
	}

	/** Nhà cung cấp trả 4xx = token sai hay hết hạn; còn lại (5xx, mất mạng) là lỗi phía họ, người dùng thử lại. */
	private static Map<?, ?> call(String provider, java.util.function.Supplier<Map<?, ?>> request) {
		try {
			Map<?, ?> body = request.get();
			return body == null ? Map.of() : body;
		} catch (HttpClientErrorException e) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID);
		} catch (RestClientException e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Không kết nối được " + provider + ", thử lại sau");
		}
	}

	private static String text(Object value) {
		return value == null || value.toString().isBlank() ? null : value.toString();
	}

	/** Hồ sơ giới hạn họ tên 100 ký tự như form đăng ký. */
	private static String nameOr(Object name, String email) {
		String n = text(name);
		n = n == null ? email.substring(0, email.indexOf('@')) : n.strip();
		return n.length() > 100 ? n.substring(0, 100) : n;
	}

	private static String hmacSha256Hex(String secret, String message) {
		try {
			Mac mac = Mac.getInstance("HmacSHA256");
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
			return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
		} catch (java.security.GeneralSecurityException e) {
			throw new IllegalStateException(e);
		}
	}
}
