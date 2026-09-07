package com.fitness.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Khung tối thiểu. concept-backend-v1.md §5 và §3.2: JWT verify sẽ gắn vào đây
 * bằng oauth2ResourceServer() khi package auth/ có JwtIssuer thật.
 * /api/** mở tạm (permitAll) — auth chưa xây ở đợt TN1 backend này, quyết
 * định của PM. Đóng lại (anyRequest().authenticated() + oauth2ResourceServer)
 * khi package auth/ có JwtIssuer.
 */
@Configuration
public class SecurityConfig {

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.csrf(csrf -> csrf.disable())                       // API JSON thuần, không session cookie
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health", "/actuator/info").permitAll()
				.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers("/api/**", "/error").permitAll()
				.anyRequest().authenticated());
		return http.build();
	}
}
