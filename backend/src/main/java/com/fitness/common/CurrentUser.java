package com.fitness.common;

import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** concept-backend-v1.md §3.2 — đọc userId từ JWT đã verify (`sub` claim). */
@Component
public class CurrentUser {

	public UUID id() {
		var auth = SecurityContextHolder.getContext().getAuthentication();
		if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
			throw new IllegalStateException("Không có JWT hợp lệ trong SecurityContext");
		}
		return UUID.fromString(jwtAuth.getToken().getSubject());
	}
}
