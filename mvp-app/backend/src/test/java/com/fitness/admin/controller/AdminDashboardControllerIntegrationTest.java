package com.fitness.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.dto.AdminDashboardResponse.GoalCountResponse;
import com.fitness.admin.dto.AdminDashboardResponse.ProgramStatResponse;
import com.fitness.auth.entity.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Trang Tổng quan admin. DB test dùng chung giữa các class, nên khẳng định theo template mới tạo trong
 * test; mục tiêu chỉ kiểm khung và số tối thiểu.
 */
class AdminDashboardControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void regularUser_isForbidden() {
		var resp = get(newAuthedUser(Role.USER).headers(), "?days=30", String.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void unsupportedDays_returns400() {
		var resp = get(newAuthedUser(Role.ADMIN).headers(), "?days=14", String.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void admin_seesProgramStatsAndGoals() {
		UUID user = newAuthedUser(Role.USER).userId();
		jdbc.update("insert into profiles (user_id, goal) values (?, 'FAT_LOSS') "
				+ "on conflict (user_id) do update set goal = 'FAT_LOSS'", user);
		UUID template = jdbc.queryForObject(
				"insert into program_templates (slug, name, sessions_min, sessions_max, week_structure, progression) "
						+ "values (?, 'Template tổng quan', 3, 3, '[]'::jsonb, '{}'::jsonb) returning id",
				UUID.class, "dashboard-" + UUID.randomUUID());
		UUID program = jdbc.queryForObject(
				"insert into programs (user_id, template_id, params, start_date) "
						+ "values (?, ?, '{}'::jsonb, current_date - 7) returning id",
				UUID.class, user, template);
		UUID done = jdbc.queryForObject(
				"insert into scheduled_workouts (program_id, scheduled_on, week_index, status) "
						+ "values (?, current_date - 1, 1, 'DONE') returning id",
				UUID.class, program);
		jdbc.update("insert into workout_sessions (user_id, scheduled_workout_id, status) values (?, ?, 'DONE')",
				user, done);
		// Buổi lỡ: PLANNED mà đã qua ngày.
		jdbc.update("insert into scheduled_workouts (program_id, scheduled_on, week_index) values (?, current_date - 2, 1)",
				program);

		// Người bị khoá và admin có chương trình cũng không phải "người đang tập".
		UUID locked = newAuthedUser(Role.USER).userId();
		jdbc.update("update users set is_active = false where id = ?", locked);
		UUID admin = newAuthedUser(Role.ADMIN).userId();
		for (UUID other : new UUID[] {locked, admin}) {
			jdbc.update("insert into programs (user_id, template_id, params, start_date) "
					+ "values (?, ?, '{}'::jsonb, current_date - 7)", other, template);
		}

		var resp = get(newAuthedUser(Role.ADMIN).headers(), "?days=30", AdminDashboardResponse.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		AdminDashboardResponse r = resp.getBody();

		assertThat(r.days()).isEqualTo(30);
		assertThat(r.programs()).filteredOn(p -> template.equals(p.templateId()))
				.extracting(ProgramStatResponse::name, ProgramStatResponse::users, ProgramStatResponse::done,
						ProgramStatResponse::missed)
				.containsExactly(tuple("Template tổng quan", 1, 1, 1));
		assertThat(r.sessions()).isGreaterThanOrEqualTo(1);
		assertThat(r.missedWorkouts()).isGreaterThanOrEqualTo(1);
		assertThat(r.goals()).extracting(GoalCountResponse::goal)
				.containsExactly("MUSCLE", "FAT_LOSS", "STRENGTH", "GENERAL", "NONE");
		assertThat(r.goals().get(1).users()).isGreaterThanOrEqualTo(1);
	}

	private <T> org.springframework.http.ResponseEntity<T> get(HttpHeaders headers, String query, Class<T> type) {
		return rest.exchange("/api/v1/admin/dashboard" + query, HttpMethod.GET, new HttpEntity<>(headers), type);
	}
}
