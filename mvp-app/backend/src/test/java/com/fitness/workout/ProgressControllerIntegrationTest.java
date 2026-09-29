package com.fitness.workout;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.ExerciseRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

/** Màn Cài đặt › Tiến bộ (doc/design-cai-dat-v1.md §3): tổng và cột theo tuần, chỉ dữ liệu người gọi. */
class ProgressControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private WorkoutSessionRepository sessions;
	@Autowired
	private SetLogRepository setLogs;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void progress_splitsTonnageIntoWeeks_oldestFirst_andSumsToTotal() {
		AuthedUser me = newAuthedUser(Role.USER);
		UUID squat = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();
		saveSession(me.userId(), 1, (short) 8, squat, 60, 5);   // tuần gần nhất: 300 kg
		saveSession(me.userId(), 10, (short) 6, squat, 50, 4);  // tuần thứ 2 tính từ bây giờ: 200 kg
		saveSession(newAuthedUser(Role.USER).userId(), 1, (short) 3, squat, 999, 9); // người khác

		ProgressService.Progress p = get(me.headers(), 4);

		assertThat(p.weeks()).isEqualTo(4);
		assertThat(p.sessionsStarted()).isEqualTo(2);
		assertThat(p.sessionsFinished()).isEqualTo(2);
		assertThat(p.avgSessionRpe()).isEqualTo(7.0);
		assertThat(p.totalTonnageKg()).isEqualByComparingTo("500");
		assertThat(p.weekly()).hasSize(4);
		assertThat(p.weekly()).extracting(ProgressService.Week::tonnageKg)
				.usingElementComparator(BigDecimal::compareTo)
				.containsExactly(BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("200"), new BigDecimal("300"));
		assertThat(p.weekly().get(0).from()).isBefore(p.weekly().get(3).from());
	}

	@Test
	void progress_weeksOutOfRange_isClamped() {
		AuthedUser me = newAuthedUser(Role.USER);
		assertThat(get(me.headers(), 0).weekly()).hasSize(1);
		assertThat(get(me.headers(), 500).weekly()).hasSize(52);
	}

	private ProgressService.Progress get(HttpHeaders headers, int weeks) {
		var resp = rest.exchange("/api/v1/me/progress?weeks=" + weeks, HttpMethod.GET,
				new HttpEntity<>(headers), ProgressService.Progress.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		return resp.getBody();
	}

	private void saveSession(UUID userId, int daysAgo, short rpe, UUID exerciseId, int loadKg, int reps) {
		WorkoutSession session = new WorkoutSession(userId, null);
		session.finish(rpe);
		session = sessions.save(session);
		// started_at không cho JPA sửa (updatable = false) — lùi ngày thẳng bằng SQL.
		jdbc.update("update workout_sessions set started_at = ? where id = ?",
				Timestamp.from(Instant.now().minus(Duration.ofDays(daysAgo))), session.getId());
		SetLog log = new SetLog(session.getId(), exerciseId, (short) 0);
		log.apply((short) reps, (short) reps, new BigDecimal(loadKg), (short) 8, false, null);
		setLogs.save(log);
	}
}
