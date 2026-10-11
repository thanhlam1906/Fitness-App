package com.fitness.admin.service;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.service.insights.DashboardActivity;
import com.fitness.admin.service.insights.DashboardActivity.FeedbackDay;
import com.fitness.admin.service.insights.DashboardActivity.FormCheckCount;
import com.fitness.admin.service.insights.DashboardActivity.QuestionDay;
import com.fitness.admin.service.insights.DashboardStats;
import com.fitness.admin.service.insights.DashboardStats.TemplateRow;
import com.fitness.assistant.repository.AssistantMessageRepository;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.feedback.repository.CueFeedbackRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.review.repository.VideoReviewRequestRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Trang Tổng quan của admin. Chỉ đọc. Khoảng ngày và cách tính buổi đã tập, buổi lỡ giống trang
 * Buổi tập (WorkoutInsightsService) để hai trang cùng một số.
 */
@Service
public class AdminDashboardService {

	private static final Set<Integer> DAYS = Set.of(7, 30, 90);
	/** Gom theo ngày người dùng thấy. Trùng múi JVM đặt ở FitnessApplication, nhưng ghi rõ để SQL dùng cùng. */
	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

	private final WorkoutSessionRepository workoutSessions;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ProgramRepository programs;
	private final ProgramTemplateRepository templates;
	private final VideoReviewRequestRepository reviewRequests;
	private final CueFeedbackRepository feedback;
	private final AssistantMessageRepository assistantMessages;

	public AdminDashboardService(
			WorkoutSessionRepository workoutSessions, ScheduledWorkoutRepository scheduledWorkouts,
			ProgramRepository programs, ProgramTemplateRepository templates,
			VideoReviewRequestRepository reviewRequests, CueFeedbackRepository feedback,
			AssistantMessageRepository assistantMessages) {
		this.workoutSessions = workoutSessions;
		this.scheduledWorkouts = scheduledWorkouts;
		this.programs = programs;
		this.templates = templates;
		this.reviewRequests = reviewRequests;
		this.feedback = feedback;
		this.assistantMessages = assistantMessages;
	}

	public AdminDashboardResponse get(int days) {
		if (!DAYS.contains(days)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoảng thời gian chỉ nhận 7, 30 hoặc 90 ngày");
		}
		LocalDate today = LocalDate.now();
		// HashMap vì khoá null (lịch tự thiết kế) là hợp lệ.
		Map<UUID, Long> usersByTemplate = new HashMap<>();
		for (Object[] r : programs.activeUserCountsByTemplate()) {
			usersByTemplate.put((UUID) r[0], (Long) r[1]);
		}
		Map<String, Long> usersByGoal = new HashMap<>();
		for (Object[] r : programs.activeGoalCounts()) {
			usersByGoal.put((String) r[0], (Long) r[1]);
		}
		return DashboardStats.compute(
				days,
				templates.findAll().stream().map(t -> new TemplateRow(t.getId(), t.getName(), t.isActive())).toList(),
				usersByTemplate,
				workoutSessions.insightRowsSince(Instant.now().minus(days, ChronoUnit.DAYS)).stream()
						.map(r -> (UUID) r[1])
						.toList(),
				scheduledWorkouts.missedTemplateIdsBetween(today.minusDays(days), today),
				usersByGoal,
				activity(days));
	}

	/** doc/design-tong-quan-v2-v1.md §3: `days` ngày lịch giờ VN, kết thúc hôm nay. */
	private DashboardActivity.Result activity(int days) {
		LocalDate today = LocalDate.now(ZONE);
		Instant since = today.minusDays(days - 1L).atStartOfDay(ZONE).toInstant();
		String zone = ZONE.getId();
		return DashboardActivity.compute(today, days,
				reviewRequests.doneCountsByExerciseSince(since).stream()
						.map(r -> new FormCheckCount((UUID) r[0], (String) r[1], count(r[2]), count(r[3])))
						.toList(),
				feedback.wrongByDayAndSourceSince(since, zone).stream()
						.map(r -> new FeedbackDay(day(r[0]), (String) r[1], count(r[2])))
						.toList(),
				assistantMessages.questionsByDayAndUserSince(since, zone).stream()
						.map(r -> new QuestionDay(day(r[0]), (UUID) r[1], count(r[2])))
						.toList());
	}

	private static long count(Object o) {
		return ((Number) o).longValue();
	}

	/** Hibernate trả cột date của truy vấn native là java.sql.Date hay LocalDate tuỳ bản; nhận cả hai. */
	private static LocalDate day(Object o) {
		return o instanceof LocalDate d ? d : ((java.sql.Date) o).toLocalDate();
	}
}
