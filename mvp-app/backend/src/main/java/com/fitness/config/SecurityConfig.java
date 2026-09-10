package com.fitness.config;

import java.util.Collection;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * concept-backend-v1.md §5: JWT HMAC-SHA256, verify qua oauth2ResourceServer
 * (Spring lo, JwtIssuer chỉ cấp token). "role" claim map sang authority
 * ROLE_xxx để @PreAuthorize("hasRole('ADMIN')") ở các controller ghi của
 * catalog dùng được — xem ExerciseController/FormCheckController/
 * ProgramTemplateAdminController. GET của các controller đó vẫn mở cho mọi
 * user đã đăng nhập (đọc catalog để hiển thị lịch/chọn chương trình).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	JwtDecoder jwtDecoder(@Value("${app.jwt-secret}") String secret) {
		SecretKeySpec key = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
		return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build();
	}

	/**
	 * Chuỗi RIÊNG cho /auth/**, không gắn oauth2ResourceServer.
	 *
	 * Vì sao tách: BearerTokenAuthenticationFilter chạy ở tầng XÁC THỰC, trước
	 * cả rule permitAll. Nằm chung một chuỗi thì một request đăng nhập lỡ mang
	 * theo header `Authorization: Bearer <token hết hạn>` bị chặn 401 ngay —
	 * người dùng còn token cũ trong máy không tài nào đăng nhập lại được, phải
	 * tự xoá localStorage mới thoát. Client web đã sửa để không gửi header đó
	 * nữa, nhưng app mobile Đợt 7 dùng chung API này, nên chặn luôn ở server:
	 * /auth/** không đọc token, có gửi kèm cũng bị bỏ qua.
	 */
	@Bean
	@Order(1)
	SecurityFilterChain authFilterChain(HttpSecurity http) throws Exception {
		http
			.securityMatcher("/api/v1/auth/**")
			.csrf(csrf -> csrf.disable())
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
		return http.build();
	}

	@Bean
	@Order(2)
	SecurityFilterChain filterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception {
		http
			.csrf(csrf -> csrf.disable())                       // API JSON thuần, không session cookie
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health", "/actuator/info").permitAll()
				.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers("/api/v1/auth/**", "/error").permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.decoder(jwtDecoder).jwtAuthenticationConverter(jwtAuthenticationConverter())));
		return http.build();
	}

	private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
		var converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(jwt -> {
			// "role" là 1 chuỗi ("ADMIN"/"USER"), không phải mảng — JwtGrantedAuthoritiesConverter
			// mặc định chỉ đọc mảng, nên map tay cho đúng 1 authority.
			Collection<GrantedAuthority> authorities = new java.util.ArrayList<>();
			String role = jwt.getClaimAsString("role");
			if (role != null) {
				authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
			}
			return authorities;
		});
		return converter;
	}
}
