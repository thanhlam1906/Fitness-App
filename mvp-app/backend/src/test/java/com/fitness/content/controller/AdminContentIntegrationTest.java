package com.fitness.content.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.dto.FormCheckRequest;
import com.fitness.content.dto.FormCheckResponse;
import com.fitness.content.dto.ProgramTemplateAdminResponse;
import com.fitness.content.dto.ProgramTemplateRequest;
import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/** Màn 12 concept-frontend-v1.md: CRUD bài tập + form_checks + template cho admin. */
class AdminContentIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	private static ExerciseRequest exerciseRequest(String slug, boolean active) {
		return new ExerciseRequest(
				slug, "Test Exercise", "Bài test", List.of("QUADS"), List.of("BARBELL_RACK"),
				"mô tả", null, active);
	}

	@Test
	void createExercise_persistsAndReturns201() {
		HttpHeaders admin = adminHeaders();

		var response = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("test-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(response.getBody().nameEn()).isEqualTo("Test Exercise");
		assertThat(response.getBody().muscleGroups()).containsExactly("QUADS");
	}

	@Test
	void createExercise_withoutAdminRole_returns403() {
		HttpHeaders user = newAuthedUser(Role.USER).headers();

		var response = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("forbidden-ex-" + UUID.randomUUID(), true), user), Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void createExercise_duplicateSlug_returns409() {
		HttpHeaders admin = adminHeaders();
		String slug = "dup-ex-" + UUID.randomUUID();
		rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest(slug, true), admin), ExerciseResponse.class);

		var second = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest(slug, true), admin), ExerciseResponse.class);

		assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void updateExercise_changesFields() {
		HttpHeaders admin = adminHeaders();
		var created = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("update-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody();

		var updateReq = new ExerciseRequest(
				"ignored-on-update", "Updated Name", "Tên mới", List.of("GLUTES"), List.of("DUMBBELL"),
				"mô tả mới", null, true);
		rest.exchange("/api/v1/exercises/" + created.id(), HttpMethod.PUT,
				new HttpEntity<>(updateReq, admin), ExerciseResponse.class);

		var fetched = rest.exchange("/api/v1/exercises/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(admin), ExerciseResponse.class).getBody();
		assertThat(fetched.nameEn()).isEqualTo("Updated Name");
		assertThat(fetched.slug()).isEqualTo(created.slug()); // slug không đổi
	}

	@Test
	void deactivateExercise_setsActiveFalse() {
		HttpHeaders admin = adminHeaders();
		var created = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("deact-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody();

		rest.exchange("/api/v1/exercises/" + created.id(), HttpMethod.DELETE, new HttpEntity<>(admin), ExerciseResponse.class);

		var fetched = rest.exchange("/api/v1/exercises/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(admin), ExerciseResponse.class).getBody();
		assertThat(fetched.active()).isFalse();
	}

	@Test
	void listExercises_includesCreated() {
		HttpHeaders admin = adminHeaders();
		var created = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("list-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody();

		var all = rest.exchange("/api/v1/exercises", HttpMethod.GET, new HttpEntity<>(admin), ExerciseResponse[].class)
				.getBody();

		assertThat(all).extracting(ExerciseResponse::id).contains(created.id());
	}

	private static FormCheckRequest check(String view, String measure, Integer from, Integer to) {
		return new FormCheckRequest(view, measure, "PEAK", from, to, 15, "Ngồi đủ sâu", "Hạ hông thấp hơn.");
	}

	private UUID newExercise(HttpHeaders admin) {
		return rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("fc-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody().id();
	}

	private ResponseEntity<FormCheckResponse> postCheck(HttpHeaders admin, UUID exerciseId, FormCheckRequest req) {
		return rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
				new HttpEntity<>(req, admin), FormCheckResponse.class);
	}

	private ExerciseResponse exercise(HttpHeaders admin, UUID id) {
		return rest.exchange("/api/v1/exercises/" + id, HttpMethod.GET, new HttpEntity<>(admin), ExerciseResponse.class)
				.getBody();
	}

	private FormCheckResponse[] checks(HttpHeaders admin, UUID exerciseId) {
		return rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.GET,
				new HttpEntity<>(admin), FormCheckResponse[].class).getBody();
	}

	@Test
	void createFormCheck_persistsAndMakesExerciseAnalyzable() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		assertThat(exercise(admin, exerciseId).analyzable()).isFalse();

		var response = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100));

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(response.getBody().from()).isNull();
		assertThat(response.getBody().to()).isEqualTo(100);
		assertThat(response.getBody().warn()).isEqualTo(15);
		assertThat(response.getBody().priority()).isEqualTo((short) 1);
		ExerciseResponse after = exercise(admin, exerciseId);
		assertThat(after.analyzable()).isTrue();
		assertThat(after.checkViews()).containsExactly("SAGITTAL");
	}

	@Test
	void createFormCheck_invalid_returns400() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		for (FormCheckRequest bad : List.of(
				check("FRONTAL", "knee", null, 100),    // gối không đo đúng khi quay chính diện
				check("SAGITTAL", "nose", null, 100),   // không có số đo này
				check("SAGITTAL", "knee", null, null),  // không có ngưỡng nào
				check("SAGITTAL", "knee", null, 200),   // ngoài thang 0–180
				check("SAGITTAL", "knee", 110, 80))) {  // từ ≥ đến
			assertThat(rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
					new HttpEntity<>(bad, admin), Map.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		}
	}

	@Test
	void createFormCheck_sameJointTwice_returns409() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100));

		assertThat(postCheck(admin, exerciseId, check("SAGITTAL", "knee", 80, 110)).getStatusCode())
				.isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void deactivateLastCheck_exerciseNotAnalyzable_thenSameJointCanBeAddedAgain() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		UUID checkId = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100)).getBody().id();

		rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks/" + checkId, HttpMethod.DELETE,
				new HttpEntity<>(admin), FormCheckResponse.class);
		assertThat(exercise(admin, exerciseId).analyzable()).isFalse();
		assertThat(checks(admin, exerciseId)).isEmpty();

		var again = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 95));
		assertThat(again.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(again.getBody().id()).isEqualTo(checkId);   // bật lại dòng cũ, UNIQUE (exercise_id, code)
		assertThat(exercise(admin, exerciseId).analyzable()).isTrue();
	}

	@Test
	void updateFormCheck_changingJoint_replacesOldOne() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		UUID checkId = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100)).getBody().id();

		var updated = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks/" + checkId, HttpMethod.PUT,
				new HttpEntity<>(check("SAGITTAL", "hip", null, 90), admin), FormCheckResponse.class);

		assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(checks(admin, exerciseId)).extracting(FormCheckResponse::measure).containsExactly("hip");
	}

	@Test
	void checkViews_followCameraOrder() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		postCheck(admin, exerciseId, check("FRONTAL", "valgus", null, 10));
		postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100));

		assertThat(exercise(admin, exerciseId).checkViews()).containsExactly("SAGITTAL", "FRONTAL");
	}

	@Test
	void createTemplate_persistsAndReturns201() {
		HttpHeaders admin = adminHeaders();
		var req = new ProgramTemplateRequest(
				"test-template-" + UUID.randomUUID(), "Test Template", "mô tả", (short) 2, (short) 3,
				List.of("ADMIN_TEST_EQUIPMENT"), VALID_WEEK,
				"{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{}}", true);

		var response = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(req, admin), ProgramTemplateAdminResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(response.getBody().name()).isEqualTo("Test Template");
	}

	@Test
	void createTemplate_invalidWeekStructureJson_returns400() {
		HttpHeaders admin = adminHeaders();
		var req = new ProgramTemplateRequest(
				"bad-template-" + UUID.randomUUID(), "Bad", null, (short) 2, (short) 3,
				List.of("ADMIN_TEST_EQUIPMENT"), "not json", "{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{}}", true);

		var response = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(req, admin), Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void updateTemplate_changesFields() {
		HttpHeaders admin = adminHeaders();
		var req = new ProgramTemplateRequest(
				"upd-template-" + UUID.randomUUID(), "Before", null, (short) 2, (short) 3,
				List.of("ADMIN_TEST_EQUIPMENT"), VALID_WEEK, "{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{}}", true);
		var created = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(req, admin), ProgramTemplateAdminResponse.class).getBody();

		var updateReq = new ProgramTemplateRequest(
				"ignored", "After", "cập nhật", (short) 4, (short) 4,
				List.of("ADMIN_TEST_EQUIPMENT_2"), VALID_WEEK, "{\"mode\":\"DOUBLE\",\"target_rpe\":9,\"increment_kg\":{}}", true);
		rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.PUT,
				new HttpEntity<>(updateReq, admin), ProgramTemplateAdminResponse.class);

		var fetched = rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(admin), ProgramTemplateAdminResponse.class).getBody();
		assertThat(fetched.name()).isEqualTo("After");
		assertThat(fetched.sessionsMin()).isEqualTo((short) 4);
		assertThat(fetched.slug()).isEqualTo(created.slug());
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"[]",
			"null",
			"[null]",
			"[{\"order\":1,\"label\":\"A\",\"exercises\":[{\"sets\":3}]}]",
			"[{\"order\":1,\"label\":\"A\",\"exercises\":[]}]",
			"[{\"order\":1,\"label\":\"A\",\"exercises\":[{\"slug\":\"khong-co-bai-nay\",\"sets\":3,\"reps_min\":5,\"reps_max\":5,\"rest_sec\":60}]}]"})
	void createTemplate_unusableWeekStructure_returns400(String weekStructure) {
		// Người dùng chọn template như vậy sẽ lỗi 500 lúc sinh lịch (chia cho 0, bài không tồn tại).
		var req = new ProgramTemplateRequest(
				"unusable-" + UUID.randomUUID(), "Hỏng", null, (short) 2, (short) 3,
				List.of("ADMIN_TEST_EQUIPMENT"), weekStructure, PROGRESSION, true);

		var response = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(req, adminHeaders()), Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void updateTemplate_toEmptyWeekStructure_returns400() {
		HttpHeaders admin = adminHeaders();
		var created = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(new ProgramTemplateRequest("upd-empty-" + UUID.randomUUID(), "Trước", null,
						(short) 2, (short) 3, List.of("ADMIN_TEST_EQUIPMENT"), VALID_WEEK, PROGRESSION, true), admin),
				ProgramTemplateAdminResponse.class).getBody();

		var response = rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.PUT,
				new HttpEntity<>(new ProgramTemplateRequest(null, "Sau", null, (short) 2, (short) 3,
						List.of("ADMIN_TEST_EQUIPMENT"), "[]", PROGRESSION, true), admin),
				Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	private static final String VALID_WEEK =
			"[{\"order\":1,\"label\":\"A\",\"exercises\":[{\"slug\":\"push-up\",\"sets\":3,\"reps_min\":8,\"reps_max\":12,\"rest_sec\":60}]}]";
	private static final String PROGRESSION = "{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{}}";

	private HttpHeaders adminHeaders() {
		return newAuthedUser(Role.ADMIN).headers();
	}
}
