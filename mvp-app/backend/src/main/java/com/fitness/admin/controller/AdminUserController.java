package com.fitness.admin.controller;

import com.fitness.admin.dto.AdminAuditLogResponse;
import com.fitness.admin.dto.AdminOverviewResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.dto.AdminTemporaryPasswordResponse;
import com.fitness.admin.dto.AdminUserCreateRequest;
import com.fitness.admin.dto.AdminUserCreatedResponse;
import com.fitness.admin.dto.AdminUserDeleteRequest;
import com.fitness.admin.dto.AdminUserDetailResponse;
import com.fitness.admin.dto.AdminUserRoleRequest;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.admin.dto.AdminUserStatusRequest;
import com.fitness.admin.service.AdminAuditService;
import com.fitness.admin.service.AdminUserService;
import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Màn 11 concept-frontend-v1.md — danh sách và hồ sơ người dùng cho admin.
 * "Không xem video, không chấm bài" (§7 ke-hoach-chi-tiet-chuc-nang-v1.md):
 * ở đây KHÔNG có endpoint nào trả clip hay kết quả chấm form. Cố ý.
 * Quản lý tài khoản (khoá, vai trò, mật khẩu tạm, tạo, xoá) và nhật ký — doc/design-quan-ly-user-v1.md §5.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

	private final AdminUserService adminUserService;
	private final AdminAuditService auditService;
	private final CurrentUser currentUser;

	public AdminUserController(
			AdminUserService adminUserService, AdminAuditService auditService, CurrentUser currentUser) {
		this.adminUserService = adminUserService;
		this.auditService = auditService;
		this.currentUser = currentUser;
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

	@PostMapping("/users")
	@ResponseStatus(HttpStatus.CREATED)
	public AdminUserCreatedResponse create(@Valid @RequestBody AdminUserCreateRequest request) {
		return adminUserService.create(currentUser.id(), request);
	}

	@PatchMapping("/users/{id}/status")
	public AdminUserRowResponse setStatus(@PathVariable UUID id, @Valid @RequestBody AdminUserStatusRequest request) {
		return adminUserService.setStatus(currentUser.id(), id, request);
	}

	@PatchMapping("/users/{id}/role")
	public AdminUserRowResponse changeRole(@PathVariable UUID id, @Valid @RequestBody AdminUserRoleRequest request) {
		return adminUserService.changeRole(currentUser.id(), id, request);
	}

	@PostMapping("/users/{id}/reset-password")
	public AdminTemporaryPasswordResponse resetPassword(@PathVariable UUID id) {
		return adminUserService.resetPassword(currentUser.id(), id);
	}

	@DeleteMapping("/users/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID id, @RequestBody AdminUserDeleteRequest request) {
		adminUserService.delete(currentUser.id(), id, request);
	}

	@GetMapping("/audit")
	public AdminPageResponse<AdminAuditLogResponse> audit(
			@RequestParam(required = false) UUID targetId,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return auditService.list(targetId, page, size);
	}
}
