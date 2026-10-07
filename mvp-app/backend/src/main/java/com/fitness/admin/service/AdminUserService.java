package com.fitness.admin.service;

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
import com.fitness.admin.repository.AdminUserQueryRepository;
import com.fitness.admin.repository.AdminUserQueryRepository.Filter;
import com.fitness.admin.repository.AdminUserQueryRepository.OverviewCounts;
import com.fitness.auth.entity.Role;
import com.fitness.auth.entity.User;
import com.fitness.auth.repository.UserRepository;
import com.fitness.auth.service.AccountService;
import com.fitness.feedback.repository.CueFeedbackRepository;
import com.fitness.profile.dto.BodyMetricResponse;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.BodyMetricRepository;
import com.fitness.profile.repository.ProfileRepository;
import com.fitness.review.service.ClipCleanupJob;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Màn admin Người dùng (doc/design-quan-ly-user-v1.md §5). Đọc qua AdminUserQueryRepository;
 * ghi bảng users đi qua AccountService của feature auth (chủ bảng).
 */
@Service
public class AdminUserService {

	private static final Set<String> STATUSES = Set.of("ALL", "TRAINING", "NOT_STARTED", "IDLE", "LOCKED");
	private static final Set<String> ROLES = Set.of("ALL", "USER", "ADMIN");
	private static final int MAX_PAGE_SIZE = 100;

	private final AdminUserQueryRepository query;
	private final UserRepository users;
	private final ProfileRepository profiles;
	private final BodyMetricRepository bodyMetrics;
	private final CueFeedbackRepository feedback;
	private final AccountService accounts;
	private final AdminAuditService audit;
	private final ClipCleanupJob clipCleanup;

	public AdminUserService(
			AdminUserQueryRepository query, UserRepository users, ProfileRepository profiles,
			BodyMetricRepository bodyMetrics, CueFeedbackRepository feedback, AccountService accounts,
			AdminAuditService audit, ClipCleanupJob clipCleanup) {
		this.query = query;
		this.users = users;
		this.profiles = profiles;
		this.bodyMetrics = bodyMetrics;
		this.feedback = feedback;
		this.accounts = accounts;
		this.audit = audit;
		this.clipCleanup = clipCleanup;
	}

	public AdminOverviewResponse overview() {
		OverviewCounts c = query.overview();
		return new AdminOverviewResponse(
				c.trainees(), c.newTrainees(), c.activeTrainees(), c.notStarted(), c.traineeSessions(),
				query.statusCounts(), feedback.countByWrongTrue());
	}

	public AdminPageResponse<AdminUserRowResponse> list(
			String q, String status, String role, String sort, String dir, int page, int size) {
		Filter filter = filter(q, status, role);
		checkSort(sort, dir);
		if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trang không hợp lệ");
		}
		List<AdminUserRowResponse> items = query.find(filter, sort, "asc".equals(dir), size, page * size)
				.stream().map(AdminUserRowResponse::from).toList();
		return new AdminPageResponse<>(items, query.count(filter), page, size);
	}

	/** Cùng bộ lọc với danh sách nhưng không phân trang: xuất toàn bộ kết quả đang lọc. */
	public String exportCsv(String q, String status, String role, String sort, String dir) {
		Filter filter = filter(q, status, role);
		checkSort(sort, dir);
		return UserCsv.write(query.find(filter, sort, "asc".equals(dir), null, null));
	}

	public AdminUserRowResponse row(UUID id) {
		return query.find(Filter.byId(id), "createdAt", false, 1, 0).stream()
				.findFirst().map(AdminUserRowResponse::from)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
	}

	public AdminUserDetailResponse get(UUID id) {
		AdminUserRowResponse row = row(id);
		User user = users.findById(id).orElseThrow();
		Profile profile = profiles.findById(id).orElseGet(() -> new Profile(id));
		BodyMetricResponse latest = BodyMetricResponse.latestOf(bodyMetrics.findByUserIdOrderByMeasuredOnDesc(id));
		return new AdminUserDetailResponse(
				row, profile.getFullName(), profile.getPhone(), user.isMustChangePassword(),
				profile.getGoal(), profile.getExperience(), profile.getSessionsPerWeek(),
				List.of(profile.getEquipment()), profile.getBirthYear(), profile.getGender(),
				profile.getDisclaimerAt(), profile.getOnboardingStep(),
				latest == null ? null : latest.heightCm(),
				latest == null ? null : latest.weightKg(),
				latest == null ? null : latest.measuredOn(),
				row.programName());
	}

	@Transactional
	public AdminUserCreatedResponse create(UUID actorId, AdminUserCreateRequest request) {
		// @Size kiểm trước khi bỏ khoảng trắng — kiểm lại sau strip như AuthService.register.
		String fullName = request.fullName().strip();
		if (fullName.length() < 2) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên không hợp lệ");
		}
		AccountService.CreatedAccount created =
				accounts.create(request.email().strip(), fullName, request.phone(), request.role());
		audit.record(actorId, created.user(), "CREATE", Map.of("role", request.role().name()), null);
		return new AdminUserCreatedResponse(row(created.user().getId()), created.temporaryPassword());
	}

	@Transactional
	public AdminUserRowResponse setStatus(UUID actorId, UUID id, AdminUserStatusRequest request) {
		User target = findUser(id);
		refuseSelf(actorId, id, "Không thể tự khoá tài khoản của chính mình");
		if (target.isActive() == request.active()) {
			return row(id);
		}
		String reason = request.active() ? blankToNull(request.reason()) : requireReason(request.reason());
		accounts.setActive(id, request.active());
		audit.record(actorId, target, request.active() ? "UNLOCK" : "LOCK", null, reason);
		return row(id);
	}

	@Transactional
	public AdminUserRowResponse changeRole(UUID actorId, UUID id, AdminUserRoleRequest request) {
		User target = findUser(id);
		refuseSelf(actorId, id, "Không thể tự đổi vai trò của chính mình");
		Role from = target.getRole();
		if (from == request.role()) {
			return row(id);
		}
		accounts.changeRole(id, request.role());
		audit.record(actorId, target, "CHANGE_ROLE", Map.of("from", from.name(), "to", request.role().name()), null);
		return row(id);
	}

	@Transactional
	public AdminTemporaryPasswordResponse resetPassword(UUID actorId, UUID id) {
		User target = findUser(id);
		refuseSelf(actorId, id, "Không thể tự đặt lại mật khẩu của chính mình — dùng Đổi mật khẩu");
		String temporary = accounts.resetPassword(id);
		audit.record(actorId, target, "RESET_PASSWORD", null, null);
		return new AdminTemporaryPasswordResponse(temporary);
	}

	/** Nhật ký ghi trước (cần email còn đó), rồi file clip, rồi mới xoá row — spec §5.6. */
	@Transactional
	public void delete(UUID actorId, UUID id, AdminUserDeleteRequest request) {
		User target = findUser(id);
		refuseSelf(actorId, id, "Không thể tự xoá tài khoản của chính mình");
		String reason = requireReason(request.reason());
		audit.record(actorId, target, "DELETE", null, reason);
		clipCleanup.deleteClipsOfUser(id);
		accounts.delete(id);
	}

	private User findUser(UUID id) {
		return users.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
	}

	/** Không ai tự khoá/đổi vai trò/xoá chính mình — nhờ vậy hệ thống luôn còn ít nhất một admin. */
	private static void refuseSelf(UUID actorId, UUID targetId, String message) {
		if (actorId.equals(targetId)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
		}
	}

	private static String requireReason(String reason) {
		String r = blankToNull(reason);
		if (r == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần nhập lý do");
		}
		return r;
	}

	private static String blankToNull(String s) {
		return s == null || s.isBlank() ? null : s.strip();
	}

	private static Filter filter(String q, String status, String role) {
		if (!STATUSES.contains(status) || !ROLES.contains(role)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bộ lọc không hợp lệ");
		}
		return new Filter(q == null ? "" : q, status, role, null);
	}

	private static void checkSort(String sort, String dir) {
		if (!AdminUserQueryRepository.SORT_COLUMNS.containsKey(sort) || !Set.of("asc", "desc").contains(dir)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cách sắp xếp không hợp lệ");
		}
	}
}
