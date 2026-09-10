package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.content.ExerciseRepository;
import com.fitness.content.ExerciseResponse;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.feedback.FeedbackController;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** §5.5 thay bài khi thiếu thiết bị, và C6 nút "góp ý này sai". */
class SubstituteIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ExerciseRepository exercises;
	@Autowired
	private ProfileRepository profiles;
	@Autowired
	private ProgramTemplateRepository templates;
	@Autowired
	private ProgramService programService;

	@Test
	void substitutes_onlyOfferExercisesTheUserHasEquipmentFor() {
		var user = newAuthedUser(Role.USER);
		saveProfile(user.userId(), "DUMBBELL");
		UUID squatId = exercises.findBySlug("barbell-back-squat").orElseThrow().getId();

		var suggestions = rest.exchange("/api/v1/exercises/" + squatId + "/substitutes", HttpMethod.GET,
				new HttpEntity<>(user.headers()), ExerciseResponse[].class).getBody();

		assertThat(suggestions).isNotNull();
		// Không bao giờ đề xuất chính nó, và không đề xuất bài cần thiết bị chưa có.
		assertThat(suggestions).noneMatch(e -> e.id().equals(squatId));
		assertThat(suggestions).allMatch(e -> Set.of("DUMBBELL").containsAll(e.equipment()));
		// Khớp theo nhóm cơ CHÍNH của squat (QUADS), không phải "trùng bất kỳ nhóm nào" —
		// nếu không, chống đẩy (chung mỗi CORE) cũng thành bài thay cho squat.
		assertThat(suggestions).allMatch(e -> e.muscleGroups().contains("QUADS"));
		assertThat(suggestions).noneMatch(e -> e.slug().equals("push-up"));
	}

	@Test
	void substitute_swapsExerciseInThatWorkoutAndKeepsOriginal() {
		var user = newAuthedUser(Role.USER);
		saveProfile(user.userId(), "BARBELL_RACK", "DUMBBELL", "BENCH");
		UUID templateId = templates.findBySlug("full-body-3x").orElseThrow().getId();
		programService.createProgram(user.userId(), templateId,
				Map.of("barbell-back-squat", 60.0), Set.of(), LocalDate.now());

		ScheduleResponse schedule = getSchedule(user.headers());
		ScheduledExerciseView squat = schedule.workouts().get(0).exercises().stream()
				.filter(e -> e.exerciseSlug().equals("barbell-back-squat")).findFirst().orElseThrow();
		UUID replacement = exercises.findBySlug("romanian-deadlift").orElseThrow().getId();

		var swapped = rest.exchange(
				"/api/v1/schedule/exercises/" + squat.id() + "/substitute", HttpMethod.POST,
				new HttpEntity<>(new ScheduleController.SubstituteRequest(replacement), user.headers()),
				ScheduledExerciseView.class);

		assertThat(swapped.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(swapped.getBody().exerciseId()).isEqualTo(replacement);
		assertThat(swapped.getBody().substitutedFromName()).isEqualTo("Squat gánh tạ");
		// Set/rep giữ tương đương; tải bỏ trống vì mức tạ bài cũ không chuyển sang bài mới.
		assertThat(swapped.getBody().targetSets()).isEqualTo(squat.targetSets());
		assertThat(swapped.getBody().targetReps()).isEqualTo(squat.targetReps());
		assertThat(swapped.getBody().targetLoadKg()).isNull();

		// Chỉ đổi đúng buổi đó, buổi sau vẫn là bài gốc.
		ScheduleResponse after = getSchedule(user.headers());
		assertThat(after.workouts().get(1).exercises())
				.anyMatch(e -> e.exerciseSlug().equals("barbell-back-squat"));
	}

	@Test
	void substitute_onSomeoneElsesSchedule_returns404() {
		var owner = newAuthedUser(Role.USER);
		saveProfile(owner.userId(), "BARBELL_RACK", "DUMBBELL", "BENCH");
		UUID templateId = templates.findBySlug("full-body-3x").orElseThrow().getId();
		programService.createProgram(owner.userId(), templateId, Map.of(), Set.of(), LocalDate.now());
		UUID scheduledExerciseId = getSchedule(owner.headers()).workouts().get(0).exercises().get(0).id();

		var stranger = newAuthedUser(Role.USER);
		saveProfile(stranger.userId(), "BARBELL_RACK", "DUMBBELL", "BENCH");
		programService.createProgram(stranger.userId(), templateId, Map.of(), Set.of(), LocalDate.now());

		var resp = rest.exchange(
				"/api/v1/schedule/exercises/" + scheduledExerciseId + "/substitute", HttpMethod.POST,
				new HttpEntity<>(new ScheduleController.SubstituteRequest(
						exercises.findBySlug("push-up").orElseThrow().getId()), stranger.headers()),
				String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void feedback_requiresExactlyOneSource() {
		HttpHeaders headers = newAuthedUser(Role.USER).headers();

		var both = rest.exchange("/api/v1/feedback", HttpMethod.POST,
				new HttpEntity<>(new FeedbackController.FeedbackRequest(
						UUID.randomUUID(), UUID.randomUUID(), true, null), headers), String.class);
		assertThat(both.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

		var neither = rest.exchange("/api/v1/feedback", HttpMethod.POST,
				new HttpEntity<>(new FeedbackController.FeedbackRequest(null, null, true, null), headers), String.class);
		assertThat(neither.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	private void saveProfile(UUID userId, String... equipment) {
		Profile profile = new Profile(userId);
		profile.patch("STRENGTH", "NEW", (short) 3, equipment, null, null, true, "DONE");
		profiles.save(profile);
	}

	private ScheduleResponse getSchedule(HttpHeaders headers) {
		return rest.exchange("/api/v1/schedule", HttpMethod.GET,
				new HttpEntity<>(headers), ScheduleResponse.class).getBody();
	}
}
