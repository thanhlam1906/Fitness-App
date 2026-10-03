package com.fitness.admin.controller;

import com.fitness.admin.dto.AdminOverviewResponse;
import com.fitness.admin.dto.AdminUserDetailResponse;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.admin.service.AdminUserService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Màn 11 concept-frontend-v1.md — danh sách và hồ sơ người dùng cho admin.
 * "Không xem video, không chấm bài" (§7 ke-hoach-chi-tiet-chuc-nang-v1.md):
 * ở đây KHÔNG có endpoint nào trả clip hay kết quả chấm form. Cố ý.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

	private final AdminUserService adminUserService;

	public AdminUserController(AdminUserService adminUserService) {
		this.adminUserService = adminUserService;
	}

	@GetMapping("/overview")
	public AdminOverviewResponse overview() {
		return adminUserService.overview();
	}

	@GetMapping("/users")
	public List<AdminUserRowResponse> list() {
		return adminUserService.list();
	}

	@GetMapping("/users/{id}")
	public AdminUserDetailResponse get(@PathVariable UUID id) {
		return adminUserService.get(id);
	}
}
