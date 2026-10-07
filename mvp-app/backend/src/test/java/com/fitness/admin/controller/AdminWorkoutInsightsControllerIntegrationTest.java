package com.fitness.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.fitness.admin.dto.WorkoutInsightsResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.CountResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.LoadDecisionResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.PainResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RepShortResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RpeOverResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SkippedResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SubstitutedResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SummaryResponse;
import com.fitness.auth.entity.Role;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
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
 * doc/design-trang-buoi-tap-v1.md §6, §8. DB test dùng chung giữa các class, nên mọi khẳng định lọc
 * theo một template mới tạo trong test.
 */
class AdminWorkoutInsightsControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private ExerciseRepository exercises;

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
	void unknownTemplate_returns404() {
		var resp = get(newAuthedUser(Role.ADMIN).headers(), "?templateId=" + UUID.randomUUID(), String.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void admin_seesAllSixBlocks_forOneTemplate() {
		UUID squat = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID bench = exercises.findBySlug("barbell-bench-press").orElseThrow().getId();
		UUID pushUp = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID user = newAuthedUser(Role.USER).userId();

		// Template mục tiêu RPE 7, vượt 1 → RPE 9 là quá nặng.
		UUID template = jdbc.queryForObject(
				"insert into program_templates (slug, name, sessions_min, sessions_max, week_structure, progression) "
						+ "values (?, 'Template thử', 3, 3, '[]'::jsonb, '{\"target_rpe\":7,\"rpe_over\":1}'::jsonb) "
						+ "returning id",
				UUID.class, "insights-" + UUID.randomUUID());
		UUID program = jdbc.queryForObject(
				"insert into programs (user_id, template_id, params, start_date) "
						+ "values (?, ?, '{}'::jsonb, current_date - 7) returning id",
				UUID.class, user, template);
		UUID workout = jdbc.queryForObject(
				"insert into scheduled_workouts (program_id, scheduled_on, week_index, status) "
						+ "values (?, current_date - 1, 1, 'DONE') returning id",
				UUID.class, program);
		// Buổi lỡ: PLANNED mà đã qua ngày, không có buổi tập.
		jdbc.update("insert into scheduled_workouts (program_id, scheduled_on, week_index) values (?, current_date - 2, 1)",
				program);
		// Chương trình cũ đã lưu trữ (người dùng đổi chương trình): buổi PLANNED của nó không phải buổi lỡ.
		UUID archived = jdbc.queryForObject(
				"insert into programs (user_id, template_id, params, start_date, status) "
						+ "values (?, ?, '{}'::jsonb, current_date - 20, 'ARCHIVED') returning id",
				UUID.class, user, template);
		jdbc.update("insert into scheduled_workouts (program_id, scheduled_on, week_index) values (?, current_date - 3, 1)",
				archived);
		jdbc.update("insert into scheduled_exercises (scheduled_workout_id, exercise_id, order_index, target_sets, "
				+ "target_reps, target_reps_max) values (?, ?, 0, 12, 8, 12)", workout, squat);
		// Bench trong lịch đã bị đổi sang chống đẩy.
		jdbc.update("insert into scheduled_exercises (scheduled_workout_id, exercise_id, order_index, target_sets, "
				+ "target_reps, target_reps_max, substituted_from) values (?, ?, 1, 3, 8, 12, ?)", workout, pushUp, bench);
		UUID session = jdbc.queryForObject(
				"insert into workout_sessions (user_id, scheduled_workout_id, status) values (?, ?, 'DONE') returning id",
				UUID.class, user, workout);
		// 12 set squat: 2 bỏ (Mệt), 3 set 6 rep RPE 9, 7 set 8 rep RPE 8.
		for (int i = 0; i < 12; i++) {
			boolean skipped = i < 2;
			jdbc.update("insert into set_logs (session_id, exercise_id, set_index, reps, rpe, skipped, skip_reason) "
					+ "values (?, ?, ?, ?, ?, ?, ?)",
					session, squat, i, skipped ? null : (i < 5 ? 6 : 8), skipped ? null : (i < 5 ? 9 : 8),
					skipped, skipped ? "TIRED" : null);
		}
		jdbc.update("insert into pain_reports (session_id, body_area, severity) values (?, 'KNEE_L', 4)", session);
		jdbc.update("insert into load_decisions (user_id, program_id, exercise_id, effective_from, direction, rule_id, "
				+ "rule_params, message_vi) values (?, ?, ?, current_date, 'DOWN', 'SETS_MISSED_TARGET', '{}'::jsonb, 'x')",
				user, program, squat);
		// SUBSTITUTE (PainRule ghi khi đau lặp lại) không thuộc Tăng/Giữ/Giảm: phải bị loại. Đặt trên bài khác
		// (bench) để nếu lọc hỏng thì thành thêm một dòng toàn 0, test mới đỏ.
		jdbc.update("insert into load_decisions (user_id, program_id, exercise_id, effective_from, direction, rule_id, "
				+ "rule_params, message_vi) values (?, ?, ?, current_date, 'SUBSTITUTE', 'PAIN_REPEATED', '{}'::jsonb, 'x')",
				user, program, bench);

		var resp = get(newAuthedUser(Role.ADMIN).headers(), "?days=30&templateId=" + template,
				WorkoutInsightsResponse.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		WorkoutInsightsResponse r = resp.getBody();

		assertThat(r.days()).isEqualTo(30);
		assertThat(r.templateId()).isEqualTo(template);
		assertThat(r.skipped()).extracting(SkippedResponse::exerciseId, SkippedResponse::sets,
				SkippedResponse::skippedSets, SkippedResponse::users, SkippedResponse::topReason)
				.containsExactly(tuple(squat, 12, 2, 1, "TIRED"));
		assertThat(r.rpeOver()).extracting(RpeOverResponse::exerciseId, RpeOverResponse::rpeLogs,
				RpeOverResponse::overCount, RpeOverResponse::avgRpe)
				.containsExactly(tuple(squat, 10, 3, 8.3));
		assertThat(r.repShort()).extracting(RepShortResponse::exerciseId, RepShortResponse::sets,
				RepShortResponse::shortSets, RepShortResponse::avgReps, RepShortResponse::avgFloor)
				.containsExactly(tuple(squat, 10, 3, 7.4, 8.0));
		assertThat(r.substituted()).extracting(SubstitutedResponse::exerciseId,
				SubstitutedResponse::usersSubstituted, SubstitutedResponse::usersScheduled)
				.containsExactly(tuple(bench, 1, 1));
		assertThat(r.pain()).extracting(PainResponse::bodyArea, PainResponse::reports, PainResponse::avgSeverity)
				.containsExactly(tuple("KNEE_L", 1, 4.0));
		assertThat(r.loadDecisions()).extracting(LoadDecisionResponse::key, LoadDecisionResponse::down,
				LoadDecisionResponse::topDownRule)
				.containsExactly(tuple(squat, 1, "SETS_MISSED_TARGET"));
		assertThat(r.loadDecisions()).hasSize(1);
		assertThat(r.loadDecisions()).extracting(LoadDecisionResponse::up, LoadDecisionResponse::hold)
				.containsExactly(tuple(0, 0));
		assertThat(r.summary()).isEqualTo(new SummaryResponse(
				1, 1, 1,
				12, 2, List.of(new CountResponse("TIRED", 2), new CountResponse("NO_EQUIPMENT", 0),
						new CountResponse("PAIN", 0), new CountResponse("OTHER", 0)),
				10, 3,
				1, 1, 4.0,
				0, 0, 1));
	}

	private <T> org.springframework.http.ResponseEntity<T> get(HttpHeaders headers, String query, Class<T> type) {
		return rest.exchange("/api/v1/admin/workout-insights" + query, HttpMethod.GET,
				new HttpEntity<>(headers), type);
	}
}
