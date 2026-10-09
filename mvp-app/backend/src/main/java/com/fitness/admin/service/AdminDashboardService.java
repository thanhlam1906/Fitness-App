package com.fitness.admin.service;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.service.insights.DashboardStats;
import com.fitness.admin.service.insights.DashboardStats.TemplateRow;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.time.Instant;
import java.time.LocalDate;
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

	private final WorkoutSessionRepository workoutSessions;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ProgramRepository programs;
	private final ProgramTemplateRepository templates;

	public AdminDashboardService(
			WorkoutSessionRepository workoutSessions, ScheduledWorkoutRepository scheduledWorkouts,
			ProgramRepository programs, ProgramTemplateRepository templates) {
		this.workoutSessions = workoutSessions;
		this.scheduledWorkouts = scheduledWorkouts;
		this.programs = programs;
		this.templates = templates;
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
				usersByGoal);
	}
}
