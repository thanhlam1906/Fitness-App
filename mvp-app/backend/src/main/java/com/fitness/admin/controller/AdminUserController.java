package com.fitness.admin.controller;

import com.fitness.admin.dto.AdminOverviewResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.dto.AdminUserDetailResponse;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.admin.service.AdminUserService;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
	public AdminPageResponse<AdminUserRowResponse> list(
			@RequestParam(defaultValue = "") String q,
			@RequestParam(defaultValue = "ALL") String status,
			@RequestParam(defaultValue = "ALL") String role,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "desc") String dir,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return adminUserService.list(q, status, role, sort, dir, page, size);
	}

	@GetMapping("/users/export")
	public ResponseEntity<byte[]> export(
			@RequestParam(defaultValue = "") String q,
			@RequestParam(defaultValue = "ALL") String status,
			@RequestParam(defaultValue = "ALL") String role,
			@RequestParam(defaultValue = "createdAt") String sort,
			@RequestParam(defaultValue = "desc") String dir) {
		return ResponseEntity.ok()
				.contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"nguoi-dung.csv\"")
				.body(adminUserService.exportCsv(q, status, role, sort, dir).getBytes(StandardCharsets.UTF_8));
	}

	@GetMapping("/users/{id}")
	public AdminUserDetailResponse get(@PathVariable UUID id) {
		return adminUserService.get(id);
	}
}
