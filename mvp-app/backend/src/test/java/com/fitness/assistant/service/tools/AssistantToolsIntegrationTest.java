package com.fitness.assistant.service.tools;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.assistant.dto.ExerciseCardResponse;
import com.fitness.auth.entity.Role;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.program.entity.LoadDecision;
import com.fitness.program.entity.Program;
import com.fitness.program.entity.ScheduledExercise;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.workout.entity.SetLog;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.SetLogRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * §9.1: bất biến quan trọng nhất của nhóm tool là KHÔNG tool nào nhận userId —
 * mỗi test set SecurityContext cho một user rồi khẳng định tool chỉ thấy dữ
 * liệu của đúng user đó, kể cả khi user khác có dữ liệu cùng bài tập.
 */
class AssistantToolsIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private AssistantTools tools;
	@Autowired
	private ProgramRepository programs;
	@Autowired
	private ScheduledWorkoutRepository scheduledWorkouts;
	@Autowired
	private ScheduledExerciseRepository scheduledExercises;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private LoadDecisionRepository loadDecisions;
	@Autowired
	private WorkoutSessionRepository workoutSessions;
	@Autowired
	private SetLogRepository setLogs;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private ToolCallLog toolCallLog;

	// DB Testcontainers dùng chung mọi test class: bài thử chèn bằng JDBC rồi xoá, không sửa bài seed.
	@AfterEach
	void cleanExerciseLookupFixtures() {
		jdbc.update("DELETE FROM exercises WHERE slug LIKE 'tra-bai-test-%'");
		toolCallLog.clear();
	}

	@Test
	void getSchedule_countsByStatusAndLabel_onlyCurrentUser_withinRange() {
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID pushUpId = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID me = newAuthedUser(Role.USER).userId();
		UUID otherUser = newAuthedUser(Role.USER).userId();
		LocalDate today = LocalDate.now();

		Program myProgram = programs.save(
				new Program(me, null, "{}", new Short[] {6, 7}, today.minusDays(10)));
		Program otherProgram = programs.save(
				new Program(otherUser, null, "{}", new Short[0], today.minusDays(10)));

		saveWorkout(myProgram.getId(), today.minusDays(7), "Dưới", squatId, new BigDecimal("60.00")); // quá hạn → bỏ lỡ
		ScheduledWorkout done = saveWorkout(myProgram.getId(), today.minusDays(3), "Dưới", squatId,
				new BigDecimal("60.00"));
		done.updateStatus("DONE");
		scheduledWorkouts.save(done);
		saveWorkout(myProgram.getId(), today.plusDays(1), "Dưới", squatId, new BigDecimal("62.50"));
		saveWorkout(myProgram.getId(), today.plusDays(8), "Trên", pushUpId, null);
		saveWorkout(myProgram.getId(), today.minusDays(30), "Trên", pushUpId, null); // ngoài khoảng hỏi
		saveWorkout(otherProgram.getId(), today.plusDays(1), "Trên", squatId, new BigDecimal("999.00")); // người khác

		asUser(me);
		AssistantTools.ScheduleRange r = tools.getSchedule(
				today.minusDays(14).toString(), today.plusDays(20).toString(), null);

		assertThat(r.hasActiveProgram()).isTrue();
		assertThat(r.error()).isNull();
		assertThat(r.total()).isEqualTo(4);
		assertThat(r.byStatus()).containsEntry("PLANNED", 2).containsEntry("DONE", 1).containsEntry("MISSED", 1)
				.containsEntry("SKIPPED", 0);
		assertThat(r.byLabel()).containsEntry("Dưới", 3).containsEntry("Trên", 1);
		assertThat(r.workouts()).extracting(AssistantTools.ScheduleDay::status)
				.containsExactly("MISSED", "DONE", "PLANNED", "PLANNED");
		assertThat(r.programEnd()).isEqualTo(today.plusDays(8));
		assertThat(r.rangeBeyondProgram()).isTrue();
		assertThat(r.restDays()).containsExactly("Thứ 7", "Chủ nhật");
		assertThat(r.nextWorkout().date()).isEqualTo(today.plusDays(1));
		assertThat(r.workouts()).flatExtracting(AssistantTools.ScheduleDay::exercises)
				.extracting(AssistantTools.ExerciseTarget::loadKg).doesNotContain(new BigDecimal("999.00"));
	}

	@Test
	void getSchedule_exerciseFilter_appliesToEveryCount() {
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID pushUpId = exercises.findBySlug("push-up").orElseThrow().getId();
		UUID me = newAuthedUser(Role.USER).userId();
		LocalDate today = LocalDate.now();
		Program p = programs.save(new Program(me, null, "{}", new Short[0], today));
		saveWorkout(p.getId(), today, "Trên", pushUpId, null);
		saveWorkout(p.getId(), today.plusDays(1), "Dưới", squatId, new BigDecimal("60.00"));
		saveWorkout(p.getId(), today.plusDays(2), "Trên", pushUpId, null);
		saveWorkout(p.getId(), today.plusDays(3), "Dưới", squatId, new BigDecimal("62.50"));

		asUser(me);
		AssistantTools.ScheduleRange r = tools.getSchedule(
				today.toString(), today.plusDays(6).toString(), "SQUAT gánh");

		assertThat(r.total()).isEqualTo(2);
		assertThat(r.byStatus()).containsEntry("PLANNED", 2);
		assertThat(r.workouts()).extracting(AssistantTools.ScheduleDay::date)
				.containsExactly(today.plusDays(1), today.plusDays(3));
		assertThat(r.nextWorkout().date()).isEqualTo(today.plusDays(1)); // buổi squat gần nhất, không phải buổi hôm nay
		assertThat(r.matchedExercises()).containsExactly("Barbell Back Squat");

		assertThat(tools.getSchedule(today.toString(), today.plusDays(6).toString(), "deadlift").matchedExercises())
				.isEmpty();
	}

	@Test
	void getSchedule_noActiveProgram_and_invalidRange() {
		UUID me = newAuthedUser(Role.USER).userId();
		asUser(me);
		LocalDate today = LocalDate.now();

		assertThat(tools.getSchedule(today.toString(), today.toString(), null).hasActiveProgram()).isFalse();

		programs.save(new Program(me, null, "{}", new Short[0], today));
		assertThat(tools.getSchedule(today.toString(), today.minusDays(1).toString(), null).error()).isNotNull();
		assertThat(tools.getSchedule(today.toString(), today.plusDays(200).toString(), null).error()).isNotNull();
		assertThat(tools.getSchedule("thang-10", today.toString(), null).error()).isNotNull();
	}

	@Test
	void explainLoadChange_returnsOnlyCurrentUsersDecision_forSameExercise() {
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID me = newAuthedUser(Role.USER).userId();
		UUID otherUser = newAuthedUser(Role.USER).userId();
		Program myProgram = programs.save(new Program(me, null, "{}", new Short[0], LocalDate.now()));
		Program otherProgram = programs.save(new Program(otherUser, null, "{}", new Short[0], LocalDate.now()));

		loadDecisions.save(new LoadDecision(otherUser, otherProgram.getId(), squatId, LocalDate.now(), "UP",
				new BigDecimal("999.00"), "double_progression", "{}", "Lời giải thích của người khác — không được lộ"));
		loadDecisions.save(new LoadDecision(me, myProgram.getId(), squatId, LocalDate.now(), "DOWN",
				new BigDecimal("-2.50"), "pain_rule", "{}", "Giảm tải vì bạn báo đau ở buổi trước."));

		asUser(me);
		AssistantTools.LoadChangeExplanation result = tools.explainLoadChange("barbell-back-squat");

		assertThat(result.decisionFound()).isTrue();
		assertThat(result.direction()).isEqualTo("DOWN");
		assertThat(result.explanation()).isEqualTo("Giảm tải vì bạn báo đau ở buổi trước.");
	}

	@Test
	void explainLoadChange_unknownSlug_saysNotFound_withoutCallingLlm() {
		asUser(newAuthedUser(Role.USER).userId());

		AssistantTools.LoadChangeExplanation result = tools.explainLoadChange("khong-ton-tai");

		assertThat(result.exerciseFound()).isFalse();
	}

	@Test
	void getProgressSummary_aggregatesOnlyCurrentUsersSessions() {
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID me = newAuthedUser(Role.USER).userId();
		UUID otherUser = newAuthedUser(Role.USER).userId();

		WorkoutSession mySession = saveFinishedSession(me, (short) 8);
		saveSetLog(mySession.getId(), squatId, (short) 5, new BigDecimal("60.00"));
		saveFinishedSession(otherUser, (short) 3); // không được lẫn vào trung bình của tôi

		asUser(me);
		AssistantTools.ProgressSummary summary = tools.getProgressSummary(4);

		assertThat(summary.sessionsStarted()).isEqualTo(1);
		assertThat(summary.sessionsFinished()).isEqualTo(1);
		assertThat(summary.totalTonnageKg()).isEqualByComparingTo(new BigDecimal("300.00")); // 60kg x 5 reps
		assertThat(summary.avgSessionRpe()).isEqualTo(8.0);
	}

	// ── findExerciseGuide: tra bài theo tên (design-thu-vien-bai-v1 §7.1) ──

	@Test
	void findExerciseGuide_tenDung_motBai() {
		List<ExerciseCardResponse> cards = tools.findExerciseGuide("Push-up");

		assertThat(cards).hasSize(1);
		assertThat(cards.get(0).slug()).isEqualTo("push-up");
		assertThat(cards.get(0).stepsVi()).isNotEmpty();
	}

	@Test
	void findExerciseGuide_tenVietBaiCu_motBai() {
		List<ExerciseCardResponse> cards = tools.findExerciseGuide("Chống đẩy");

		assertThat(cards).extracting(ExerciseCardResponse::slug).containsExactly("push-up");
	}

	@Test
	void findExerciseGuide_tenGan_toiDaBa() {
		insertCableFixtures();

		List<ExerciseCardResponse> cards = tools.findExerciseGuide("cable crossover");

		assertThat(cards).hasSizeBetween(1, 3);
		assertThat(cards).extracting(ExerciseCardResponse::nameEn)
				.allSatisfy(name -> assertThat(name).containsIgnoringCase("cable"))
				.doesNotContain("deleted cable crossover");
	}

	@Test
	void findExerciseGuide_baiChuaDuyet_tra() {
		insertCableFixtures();

		List<ExerciseCardResponse> cards = tools.findExerciseGuide("cable upper chest crossovers");

		assertThat(cards).extracting(ExerciseCardResponse::nameEn).containsExactly("cable upper chest crossovers");
	}

	@Test
	void findExerciseGuide_khongCo_rong() {
		assertThat(tools.findExerciseGuide("zzqx wobble")).isEmpty();
	}

	@Test
	void findExerciseGuide_tenRong_rong() {
		insertCableFixtures(); // bài chưa duyệt không có tên Việt: tên rỗng không được khớp đúng chúng

		assertThat(tools.findExerciseGuide("  ")).isEmpty();
	}

	@Test
	void findExerciseGuide_ghiThe() {
		toolCallLog.clear();

		tools.findExerciseGuide("Push-up");

		assertThat(toolCallLog.exerciseCards()).extracting(ExerciseCardResponse::slug).containsExactly("push-up");
		assertThat(toolCallLog.toolNames()).contains("findExerciseGuide");
	}

	private void insertCableFixtures() {
		insertExercise("cable cross-over variation", false, true);
		insertExercise("cable upper chest crossovers", false, true);
		insertExercise("cable standing up straight crossovers", false, true);
		insertExercise("cable rope crossover seated row", false, true);
		insertExercise("deleted cable crossover", false, false);
	}

	private void insertExercise(String nameEn, boolean active, boolean draft) {
		jdbc.update("INSERT INTO exercises (slug, name_en, is_active, is_draft) VALUES (?, ?, ?, ?)",
				"tra-bai-test-" + UUID.randomUUID(), nameEn, active, draft);
	}

	private ScheduledWorkout saveWorkout(UUID programId, LocalDate date, String label, UUID exerciseId,
			BigDecimal loadKg) {
		ScheduledWorkout workout = scheduledWorkouts.save(new ScheduledWorkout(programId, date, (short) 1, label));
		scheduledExercises.save(
				new ScheduledExercise(workout.getId(), exerciseId, (short) 1, (short) 3, (short) 5, (short) 5,
						loadKg, (short) 180));
		return workout;
	}

	private WorkoutSession saveFinishedSession(UUID userId, short rpe) {
		WorkoutSession session = new WorkoutSession(userId, null);
		session.finish(rpe);
		return workoutSessions.save(session);
	}

	private void saveSetLog(UUID sessionId, UUID exerciseId, short reps, BigDecimal loadKg) {
		SetLog log = new SetLog(sessionId, exerciseId, (short) 0);
		log.apply(reps, reps, loadKg, (short) 8, false, null);
		setLogs.save(log);
	}

	private void asUser(UUID userId) {
		Jwt jwt = Jwt.withTokenValue("test").header("alg", "none").subject(userId.toString())
				.claim("sub", userId.toString()).build();
		SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
	}
}
