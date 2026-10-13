package com.fitness.auth.controller;

import com.fitness.auth.dto.FirstLoginPasswordRequest;
import com.fitness.auth.dto.LoginRequest;
import com.fitness.auth.dto.RefreshRequest;
import com.fitness.auth.dto.RegisterRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/** IP lấy từ Tomcat: sau Caddy vẫn là IP người dùng nhờ server.forward-headers-strategy (application.yml). */
	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public TokenResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
		return authService.register(request, http.getRemoteAddr());
	}

	@PostMapping("/login")
	public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		return authService.login(request.email(), request.password(), http.getRemoteAddr());
	}

	@PostMapping("/change-password")
	public TokenResponse changePasswordAtLogin(
			@Valid @RequestBody FirstLoginPasswordRequest request, HttpServletRequest http) {
		return authService.changePasswordAtLogin(request, http.getRemoteAddr());
	}

	@PostMapping("/refresh")
	public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
		return authService.refresh(request.refreshToken());
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(@Valid @RequestBody RefreshRequest request) {
		authService.logout(request.refreshToken());
	}
}
