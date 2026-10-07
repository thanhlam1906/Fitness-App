package com.fitness.auth.controller;

import com.fitness.auth.dto.ChangePasswordRequest;
import com.fitness.auth.dto.TokenResponse;
import com.fitness.auth.service.AuthService;
import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cài đặt › Đổi mật khẩu (web, mobile, cả admin). Trả token mới vì token cũ vừa bị thu hồi. */
@RestController
@RequestMapping("/api/v1/me")
public class PasswordController {

	private final AuthService authService;
	private final CurrentUser currentUser;

	public PasswordController(AuthService authService, CurrentUser currentUser) {
		this.authService = authService;
		this.currentUser = currentUser;
	}

	@PutMapping("/password")
	public TokenResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
		return authService.changePassword(currentUser.id(), request);
	}
}
