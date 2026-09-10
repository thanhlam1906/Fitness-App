package com.fitness.admin;

import com.fitness.auth.User;
import com.fitness.auth.UserRepository;
import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.feedback.CueFeedbackRepository;
import com.fitness.profile.BodyMetric;
import com.fitness.profile.BodyMetricRepository;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import com.fitness.program.Program;
import com.fitness.program.ProgramRepository;
import com.fitness.program.ScheduledWorkoutRepository;
import com.fitness.review.VideoReviewRequestRepository;
import com.fitness.workout.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Màn 11 concept-frontend-v1.md — danh sách và hồ sơ người dùng cho admin.
 * "Không xem video, không chấm bài" (§7 ke-hoach-chi-tiet-chuc-nang-v1.md):
 * ở đây KHÔNG có endpoint nào trả clip hay kết quả chấm form. Cố ý.
 *
 * ponytail: trả hết, không phân trang — concept-backend-v1.md §6 chốt "offset
 * đủ cho 100 người", và 100 người thì cả offset cũng chưa cần.
 *
 * Các cột Chương trình / Tuần / Buổi / Clip / Tuân thủ lịch của design lấy
 * bằng bốn query gộp theo user, không phải bốn query mỗi dòng.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

	private static final List<String> IN_QUEUE = List.of("PENDING", "PROCESSING");

	public record AdminUserRow(
			UUID id, String email, String role, boolean active, Instant createdAt, Instant lastActivityAt,
			String programName, Short weekIndex, Short totalWeeks,
			long sessionCount, long clipCount, Integer adherencePct) {
	}

	public record AdminUserDetail(
			AdminUserRow user,
			String goal,
			String experience,
			Short sessionsPerWeek,
			List<String> equipment,
			Short birthYear,
			String gender,
			Instant disclaimerAt,
			String onboardingStep,
			BigDecimal heightCm,
			BigDecimal weightKg,
			LocalDate measuredOn,
			String activeProgramName) {
	}

	/** Bốn ô thống kê đầu màn 11 và các badge số trên sidebar admin. */
	public record AdminOverview(
			long userCount, long activeLast7Days, long sessionsThisWeek,
			long reviewsInQueue, long wrongFeedbackCount) {
	}

	/** Số liệu lịch của một user: tổng buổi, đã xong, tổng tuần, tuần đang tới. */
	private record ScheduleStats(long total, long done, Short totalWeeks, Short currentWeek) {

		Integer adherencePct() {
			return total == 0 ? null : (int) Math.round(done * 100.0 / total);
		}
	}

	private final UserRepository users;
	private final ProfileRepository profiles;
	private final BodyMetricRepository bodyMetrics;
	private final ProgramRepository programs;
	private final ProgramTemplateRepository templates;
	private final WorkoutSessionRepository sessions;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final VideoReviewRequestRepository reviewRequests;
	private final CueFeedbackRepository feedback;

	public AdminUserController(
			UserRepository users, ProfileRepository profiles, BodyMetricRepository bodyMetrics,
			ProgramRepository programs, ProgramTemplateRepository templates, WorkoutSessionRepository sessions,
			ScheduledWorkoutRepository scheduledWorkouts, VideoReviewRequestRepository reviewRequests,
			CueFeedbackRepository feedback) {
		this.users = users;
		this.profiles = profiles;
		this.bodyMetrics = bodyMetrics;
		this.programs = programs;
		this.templates = templates;
		this.sessions = sessions;
		this.scheduledWorkouts = scheduledWorkouts;
		this.reviewRequests = reviewRequests;
		this.feedback = feedback;
	}

	@GetMapping("/overview")
	public AdminOverview overview() {
		Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);
		long activeLast7Days = sessions.lastActivityPerUser().stream()
				.filter(row -> ((Instant) row[1]).isAfter(sevenDaysAgo))
				.count();
		return new AdminOverview(
				users.count(),
				activeLast7Days,
				sessions.countByStartedAtAfter(sevenDaysAgo),
				reviewRequests.countByStatusIn(IN_QUEUE),
				feedback.countByWrongTrue());
	}

	@GetMapping("/users")
	public List<AdminUserRow> list() {
		Map<UUID, Instant> lastActivity = toInstantMap(sessions.lastActivityPerUser());
		Map<UUID, Long> sessionCounts = toCountMap(sessions.sessionCountPerUser());
		Map<UUID, Long> clipCounts = toCountMap(reviewRequests.requestCountPerUser());
		Map<UUID, ScheduleStats> scheduleStats = toScheduleStats(scheduledWorkouts.scheduleStatsPerUser());
		Map<UUID, String> programNames = activeProgramNames();

		return users.findAll().stream()
				.map(u -> toRow(
						u, lastActivity.get(u.getId()), programNames.get(u.getId()),
						scheduleStats.get(u.getId()),
						sessionCounts.getOrDefault(u.getId(), 0L),
						clipCounts.getOrDefault(u.getId(), 0L)))
				.sorted((a, b) -> b.createdAt().compareTo(a.createdAt()))
				.toList();
	}

	@GetMapping("/users/{id}")
	public AdminUserDetail get(@PathVariable UUID id) {
		User user = users.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
		Profile profile = profiles.findById(id).orElseGet(() -> new Profile(id));
		BodyMetric latest = bodyMetrics.findByUserIdOrderByMeasuredOnDesc(id).stream().findFirst().orElse(null);
		String programName = programs.findByUserIdAndStatus(id, "ACTIVE")
				.map(Program::getTemplateId)
				.flatMap(templates::findById)
				.map(ProgramTemplate::getName)
				.orElse(null);

		Instant lastActivityAt = sessions.lastActivityForUser(id).orElse(null);
		ScheduleStats stats = toScheduleStats(scheduledWorkouts.scheduleStatsPerUser()).get(id);

		return new AdminUserDetail(
				toRow(user, lastActivityAt, programName, stats,
						sessions.countByUserId(id), reviewRequests.countByUserId(id)),
				profile.getGoal(), profile.getExperience(), profile.getSessionsPerWeek(),
				List.of(profile.getEquipment()), profile.getBirthYear(), profile.getGender(),
				profile.getDisclaimerAt(), profile.getOnboardingStep(),
				latest == null ? null : latest.getHeightCm(),
				latest == null ? null : latest.getWeightKg(),
				latest == null ? null : latest.getMeasuredOn(),
				programName);
	}

	private Map<UUID, String> activeProgramNames() {
		List<Program> active = programs.findByStatus("ACTIVE");
		Map<UUID, String> nameByTemplate = templates
				.findAllById(active.stream().map(Program::getTemplateId).distinct().toList())
				.stream()
				.collect(HashMap::new, (m, t) -> m.put(t.getId(), t.getName()), HashMap::putAll);
		Map<UUID, String> byUser = new HashMap<>();
		for (Program program : active) {
			byUser.put(program.getUserId(), nameByTemplate.get(program.getTemplateId()));
		}
		return byUser;
	}

	private AdminUserRow toRow(
			User user, Instant lastActivityAt, String programName, ScheduleStats stats,
			long sessionCount, long clipCount) {
		return new AdminUserRow(
				user.getId(), user.getEmail(), user.getRole().name(), user.isActive(),
				user.getCreatedAt(), lastActivityAt, programName,
				stats == null ? null : stats.currentWeek(),
				stats == null ? null : stats.totalWeeks(),
				sessionCount, clipCount,
				stats == null ? null : stats.adherencePct());
	}

	private static Map<UUID, Instant> toInstantMap(List<Object[]> rows) {
		Map<UUID, Instant> map = new HashMap<>();
		for (Object[] row : rows) {
			map.put((UUID) row[0], (Instant) row[1]);
		}
		return map;
	}

	private static Map<UUID, Long> toCountMap(List<Object[]> rows) {
		Map<UUID, Long> map = new HashMap<>();
		for (Object[] row : rows) {
			map.put((UUID) row[0], (Long) row[1]);
		}
		return map;
	}

	private static Map<UUID, ScheduleStats> toScheduleStats(List<Object[]> rows) {
		Map<UUID, ScheduleStats> map = new HashMap<>();
		for (Object[] row : rows) {
			map.put((UUID) row[0], new ScheduleStats(
					((Number) row[1]).longValue(),
					row[2] == null ? 0L : ((Number) row[2]).longValue(),
					row[3] == null ? null : ((Number) row[3]).shortValue(),
					row[4] == null ? null : ((Number) row[4]).shortValue()));
		}
		return map;
	}
}
