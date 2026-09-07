package com.fitness.content;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Màn 12 concept-frontend-v1.md: CRUD bài tập + form_checks + template cho admin. */
class AdminContentIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;

	private static ExerciseRequest exerciseRequest(String slug, boolean active) {
		return new ExerciseRequest(
				slug, "Test Exercise", "Bài test", List.of("QUADS"), List.of("BARBELL_RACK"),
				"mô tả", true, active);
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
				"mô tả mới", false, true);
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

	@Test
	void createFormCheck_forExercise_persists() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("fc-ex-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody().id();

		var req = new FormCheckRequest(
				"depth", "hip_depth_ratio", List.of("SAGITTAL"), "{\"pass_below\":1.1}",
				new BigDecimal("0.70"), "Đạt", "Sát ngưỡng", "Chưa đạt", (short) 1, true);

		var response = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
				new HttpEntity<>(req, admin), FormCheckResponse.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		assertThat(response.getBody().exerciseId()).isEqualTo(exerciseId);
		assertThat(response.getBody().thresholds()).isEqualTo("{\"pass_below\":1.1}");
	}

	@Test
	void createFormCheck_invalidThresholdsJson_returns400() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("fc-bad-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody().id();

		var req = new FormCheckRequest(
				"depth", "hip_depth_ratio", List.of("SAGITTAL"), "{not valid json",
				new BigDecimal("0.70"), null, null, "Chưa đạt", (short) 1, true);

		var response = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
				new HttpEntity<>(req, admin), Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void createFormCheck_duplicateCodeForSameExercise_returns409() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = rest.exchange("/api/v1/exercises", HttpMethod.POST,
				new HttpEntity<>(exerciseRequest("fc-dup-" + UUID.randomUUID(), true), admin), ExerciseResponse.class)
				.getBody().id();
		var req = new FormCheckRequest(
				"depth", "hip_depth_ratio", List.of("SAGITTAL"), "{\"pass_below\":1.1}",
				new BigDecimal("0.70"), null, null, "Chưa đạt", (short) 1, true);
		rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
				new HttpEntity<>(req, admin), FormCheckResponse.class);

		var second = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks", HttpMethod.POST,
				new HttpEntity<>(req, admin), FormCheckResponse.class);

		assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
	}

	@Test
	void createTemplate_persistsAndReturns201() {
		HttpHeaders admin = adminHeaders();
		var req = new ProgramTemplateRequest(
				"test-template-" + UUID.randomUUID(), "Test Template", "mô tả", (short) 2, (short) 3,
				List.of("ADMIN_TEST_EQUIPMENT"), "[{\"order\":1,\"label\":\"A\",\"exercises\":[]}]",
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
				List.of("ADMIN_TEST_EQUIPMENT"), "[]", "{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{}}", true);
		var created = rest.exchange("/api/v1/program-templates", HttpMethod.POST,
				new HttpEntity<>(req, admin), ProgramTemplateAdminResponse.class).getBody();

		var updateReq = new ProgramTemplateRequest(
				"ignored", "After", "cập nhật", (short) 4, (short) 4,
				List.of("ADMIN_TEST_EQUIPMENT_2"), "[]", "{\"mode\":\"DOUBLE\",\"target_rpe\":9,\"increment_kg\":{}}", true);
		rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.PUT,
				new HttpEntity<>(updateReq, admin), ProgramTemplateAdminResponse.class);

		var fetched = rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(admin), ProgramTemplateAdminResponse.class).getBody();
		assertThat(fetched.name()).isEqualTo("After");
		assertThat(fetched.sessionsMin()).isEqualTo((short) 4);
		assertThat(fetched.slug()).isEqualTo(created.slug());
	}

	private HttpHeaders adminHeaders() {
		return newAuthedUser(Role.ADMIN).headers();
	}
}
