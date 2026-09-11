package com.fitness.assistant.tools;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.program.LoadDecision;
import com.fitness.program.LoadDecisionRepository;
import com.fitness.program.Program;
import com.fitness.program.ProgramRepository;
import com.fitness.program.ScheduledExercise;
import com.fitness.program.ScheduledExerciseRepository;
import com.fitness.program.ScheduledWorkout;
import com.fitness.program.ScheduledWorkoutRepository;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.workout.SetLog;
import com.fitness.workout.SetLogRepository;
import com.fitness.workout.WorkoutSession;
import com.fitness.workout.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
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

	@Test
	void getThisWeekSchedule_returnsOnlyCurrentUsersWorkoutsThisWeek() {
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		UUID me = newAuthedUser(Role.USER).userId();
		UUID otherUser = newAuthedUser(Role.USER).userId();

		Program myProgram = programs.save(new Program(me, null, "{}", new Short[0], LocalDate.now().minusWeeks(1)));
		Program otherProgram = programs.save(
				new Program(otherUser, null, "{}", new Short[0], LocalDate.now().minusWeeks(1)));

		LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
		saveWorkout(myProgram.getId(), monday, squatId, new BigDecimal("60.00"));
		saveWorkout(otherProgram.getId(), monday, squatId, new BigDecimal("999.00")); // phải KHÔNG xuất hiện
		saveWorkout(myProgram.getId(), monday.minusWeeks(2), squatId, new BigDecimal("40.00")); // tuần khác, phải bỏ qua

		asUser(me);
		AssistantTools.ThisWeekSchedule schedule = tools.getThisWeekSchedule();

		assertThat(schedule.hasActiveProgram()).isTrue();
		assertThat(schedule.days()).hasSize(1);
		assertThat(schedule.days().get(0).exercises()).extracting(AssistantTools.ExerciseTarget::loadKg)
				.containsExactly(new BigDecimal("60.00"));
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

	private void saveWorkout(UUID programId, LocalDate date, UUID exerciseId, BigDecimal loadKg) {
		ScheduledWorkout workout = scheduledWorkouts.save(new ScheduledWorkout(programId, date, (short) 1, "Buổi A"));
		scheduledExercises.save(
				new ScheduledExercise(workout.getId(), exerciseId, (short) 1, (short) 3, (short) 5, (short) 5,
						loadKg, (short) 180));
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
