package com.fitness.admin.service;

import com.fitness.admin.dto.AdminOverviewResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.dto.AdminUserDetailResponse;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.admin.repository.AdminUserQueryRepository;
import com.fitness.admin.repository.AdminUserQueryRepository.Filter;
import com.fitness.admin.repository.AdminUserQueryRepository.OverviewCounts;
import com.fitness.auth.entity.User;
import com.fitness.auth.repository.UserRepository;
import com.fitness.feedback.repository.CueFeedbackRepository;
import com.fitness.profile.dto.BodyMetricResponse;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.BodyMetricRepository;
import com.fitness.profile.repository.ProfileRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
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

	public AdminUserService(
			AdminUserQueryRepository query, UserRepository users, ProfileRepository profiles,
			BodyMetricRepository bodyMetrics, CueFeedbackRepository feedback) {
		this.query = query;
		this.users = users;
		this.profiles = profiles;
		this.bodyMetrics = bodyMetrics;
		this.feedback = feedback;
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
