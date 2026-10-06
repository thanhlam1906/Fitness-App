package com.fitness.content.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.entity.Role;
import com.fitness.content.dto.ExerciseRequest;
import com.fitness.content.dto.ExerciseResponse;
import com.fitness.content.dto.FormCheckRequest;
import com.fitness.content.dto.FormCheckResponse;
import com.fitness.content.dto.ProgramTemplateAdminResponse;
import com.fitness.content.dto.ProgramTemplateAdminResponse.DayResponse;
import com.fitness.content.dto.ProgramTemplateRequest;
import com.fitness.content.dto.ProgramTemplateRequest.DayRequest;
import com.fitness.content.dto.ProgramTemplateRequest.ProgressionRequest;
import com.fitness.content.dto.ProgramTemplateRequest.TemplateExerciseRequest;
import com.fitness.program.service.ProgramService;
import com.fitness.support.PostgresIntegrationTest;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
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
	void listFormChecks_readsThresholdsBackFromDb() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100));

		FormCheckResponse[] listed = checks(admin, exerciseId);

		assertThat(listed).hasSize(1);
		assertThat(listed[0].from()).isNull();
		assertThat(listed[0].to()).isEqualTo(100);
		assertThat(listed[0].warn()).isEqualTo(15);
		assertThat(listed[0].view()).isEqualTo("SAGITTAL");
		assertThat(listed[0].moment()).isEqualTo("PEAK");
		assertThat(listed[0].nameVi()).isEqualTo("Ngồi đủ sâu");

		postCheck(admin, exerciseId, check("SAGITTAL", "line", 165, null));

		FormCheckResponse line = Arrays.stream(checks(admin, exerciseId))
				.filter(c -> c.measure().equals("line")).findFirst().orElseThrow();
		assertThat(line.from()).isEqualTo(165);
		assertThat(line.to()).isNull();
	}

	@Test
	void updateFormCheck_intoActiveJoint_returns409_andKeepsBoth() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		UUID kneeId = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100)).getBody().id();
		postCheck(admin, exerciseId, check("SAGITTAL", "hip", null, 90));

		var response = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks/" + kneeId, HttpMethod.PUT,
				new HttpEntity<>(check("SAGITTAL", "hip", null, 90), admin), Map.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		// Cả hai còn bật: giao dịch hoàn tác việc tắt dòng knee trước khi gặp lỗi trùng.
		assertThat(checks(admin, exerciseId)).extracting(FormCheckResponse::measure)
				.containsExactlyInAnyOrder("knee", "hip");
	}

	@Test
	void updateFormCheck_sameJoint_overwritesValuesKeepsId() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		UUID checkId = postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100)).getBody().id();

		var updated = rest.exchange("/api/v1/exercises/" + exerciseId + "/form-checks/" + checkId, HttpMethod.PUT,
				new HttpEntity<>(check("SAGITTAL", "knee", 80, 110), admin), FormCheckResponse.class);

		assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(updated.getBody().id()).isEqualTo(checkId);
		FormCheckResponse[] listed = checks(admin, exerciseId);
		assertThat(listed).hasSize(1);
		assertThat(listed[0].from()).isEqualTo(80);
		assertThat(listed[0].to()).isEqualTo(110);
	}

	@Test
	void checkViews_followCameraOrder() {
		HttpHeaders admin = adminHeaders();
		UUID exerciseId = newExercise(admin);
		postCheck(admin, exerciseId, check("FRONTAL", "valgus", null, 10));
		postCheck(admin, exerciseId, check("SAGITTAL", "knee", null, 100));

		assertThat(exercise(admin, exerciseId).checkViews()).containsExactly("SAGITTAL", "FRONTAL");
	}

	@Autowired
	private ProgramService programService;

	private static TemplateExerciseRequest ex(String slug, int repsMin, int repsMax) {
		return new TemplateExerciseRequest(slug, 3, repsMin, repsMax, 90);
	}

	private static Map<String, BigDecimal> inc(Object... slugAndKg) {
		// HashMap vì Map.of không nhận null ("Không tự tăng").
		Map<String, BigDecimal> m = new HashMap<>();
		for (int i = 0; i < slugAndKg.length; i += 2) {
			m.put((String) slugAndKg[i], slugAndKg[i + 1] == null ? null : new BigDecimal(slugAndKg[i + 1].toString()));
		}
		return m;
	}

	private static ProgramTemplateRequest template(
			String name, List<String> equipment, int min, int max, List<DayRequest> days, Map<String, BigDecimal> inc) {
		return new ProgramTemplateRequest(name, "mô tả", (short) min, (short) max, equipment, true, days,
				new ProgressionRequest(8, 2, 1, 70, 2, 2, 10, inc));
	}

	private static ProgramTemplateRequest squatTemplate(String name) {
		return template(name, List.of("BARBELL_RACK"), 2, 3,
				List.of(new DayRequest("A", List.of(ex("barbell-back-squat", 5, 5), ex("push-up", 8, 12)))),
				inc("barbell-back-squat", "2.5"));
	}

	private ResponseEntity<ProgramTemplateAdminResponse> post(ProgramTemplateRequest req) {
		return rest.exchange("/api/v1/program-templates", HttpMethod.POST, new HttpEntity<>(req, adminHeaders()),
				ProgramTemplateAdminResponse.class);
	}

	@Test
	void taoTemplate_slugTuSinh_luuDungCauTruc() {
		String tag = UUID.randomUUID().toString().substring(0, 8);
		var res = post(squatTemplate("Tạo Mới " + tag));

		assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		var body = res.getBody();
		assertThat(body.slug()).isEqualTo("tao-moi-" + tag);
		assertThat(body.days()).hasSize(1);
		assertThat(body.days().get(0).exercises().get(0).slug()).isEqualTo("barbell-back-squat");
		assertThat(body.progression().minCompletionPct()).isEqualTo(70);
		assertThat(body.progression().incrementKg().get("barbell-back-squat")).isEqualByComparingTo("2.5");
		assertThat(body.activeUsers()).isZero();
	}

	@Test
	void trungTen_slugThem2() {
		String name = "Trùng " + UUID.randomUUID().toString().substring(0, 8);
		var first = post(squatTemplate(name)).getBody();
		var second = post(squatTemplate(name)).getBody();

		assertThat(second.slug()).isEqualTo(first.slug() + "-2");
	}

	static Stream<ProgramTemplateRequest> templateHong() {
		List<DayRequest> ok = List.of(new DayRequest("A", List.of(ex("barbell-back-squat", 5, 5))));
		Map<String, BigDecimal> okInc = inc("barbell-back-squat", "2.5");
		return Stream.of(
				template("Rep ngược", List.of(), 2, 3, List.of(new DayRequest("A", List.of(ex("push-up", 12, 8)))), Map.of()),
				template("Bài lạ", List.of(), 2, 3, List.of(new DayRequest("A", List.of(ex("khong-co-bai-nay", 5, 5)))), Map.of()),
				template("Thiết bị lạ", List.of("XYZ"), 2, 3, ok, okInc),
				template("Số buổi ngược", List.of(), 4, 2, ok, okInc),
				template("Thiếu bước tăng", List.of(), 2, 3, ok, Map.of()),
				template("Bước tăng 0", List.of(), 2, 3, ok, inc("barbell-back-squat", "0")),
				template("Bước tăng 25", List.of(), 2, 3, ok, inc("barbell-back-squat", "25")),
				template("Không buổi", List.of(), 2, 3, List.of(), okInc),
				template("Buổi rỗng", List.of(), 2, 3, List.of(new DayRequest("A", List.of())), okInc),
				template("Set 0", List.of(), 2, 3,
						List.of(new DayRequest("A", List.of(new TemplateExerciseRequest("push-up", 0, 8, 12, 90)))), Map.of()),
				new ProgramTemplateRequest("Ngưỡng lạ", null, (short) 2, (short) 3, List.of(), true, ok,
						new ProgressionRequest(8, 2, 1, 70, 2, 2, 90, okInc)));
	}

	@ParameterizedTest
	@MethodSource("templateHong")
	void templateHong_400(ProgramTemplateRequest req) {
		var res = rest.exchange("/api/v1/program-templates", HttpMethod.POST, new HttpEntity<>(req, adminHeaders()),
				Map.class);
		assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void khongTuTang_luuNull_vaBoKhoaCuaBaiKhongCoTrongTemplate() {
		var req = template("Tạ ấm " + UUID.randomUUID(), List.of("BARBELL_RACK"), 2, 3,
				List.of(new DayRequest("A", List.of(ex("barbell-back-squat", 5, 5)))),
				inc("barbell-back-squat", null, "overhead-press", "1.25"));
		var body = post(req).getBody();

		assertThat(body.progression().incrementKg()).containsKey("barbell-back-squat");
		assertThat(body.progression().incrementKg().get("barbell-back-squat")).isNull();
		assertThat(body.progression().incrementKg()).doesNotContainKey("overhead-press");
	}

	@Test
	void suaTemplate_giuSlug() {
		var created = post(squatTemplate("Trước " + UUID.randomUUID())).getBody();
		var update = template("Sau", List.of("BARBELL_RACK", "BENCH"), 4, 4,
				List.of(new DayRequest("Trên", List.of(ex("barbell-back-squat", 6, 8)))), inc("barbell-back-squat", "5"));

		rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.PUT,
				new HttpEntity<>(update, adminHeaders()), ProgramTemplateAdminResponse.class);
		var fetched = rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(adminHeaders()), ProgramTemplateAdminResponse.class).getBody();

		assertThat(fetched.name()).isEqualTo("Sau");
		assertThat(fetched.slug()).isEqualTo(created.slug());
		assertThat(fetched.days().get(0).label()).isEqualTo("Trên");
		assertThat(fetched.progression().incrementKg().get("barbell-back-squat")).isEqualByComparingTo("5");
	}

	@Test
	void soNguoiDangDung() {
		var created = post(template("Đếm " + UUID.randomUUID(), List.of(), 2, 3,
				List.of(new DayRequest("A", List.of(ex("push-up", 8, 12)))), Map.of())).getBody();
		programService.createProgram(newAuthedUser(Role.USER).userId(), created.id(), Map.of(),
				Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), LocalDate.of(2026, 9, 7));

		var one = rest.exchange("/api/v1/program-templates/" + created.id(), HttpMethod.GET,
				new HttpEntity<>(adminHeaders()), ProgramTemplateAdminResponse.class).getBody();
		var list = rest.exchange("/api/v1/program-templates", HttpMethod.GET,
				new HttpEntity<>(adminHeaders()), ProgramTemplateAdminResponse[].class).getBody();

		assertThat(one.activeUsers()).isEqualTo(1);
		assertThat(Arrays.stream(list).filter(t -> t.id().equals(created.id())).findFirst().orElseThrow().activeUsers())
				.isEqualTo(1);
	}

	@Test
	void templateSeedCu_thieuNguong_traVeSoMacDinh() {
		var list = rest.exchange("/api/v1/program-templates", HttpMethod.GET,
				new HttpEntity<>(adminHeaders()), ProgramTemplateAdminResponse[].class).getBody();
		var fullBody = Arrays.stream(list).filter(t -> t.slug().equals("full-body-3x")).findFirst().orElseThrow();

		assertThat(fullBody.progression().failStreakToDeload()).isEqualTo(2);
		assertThat(fullBody.progression().minCompletionPct()).isEqualTo(70);
		assertThat(fullBody.days()).extracting(DayResponse::label).containsExactly("A", "B");
	}

	private HttpHeaders adminHeaders() {
		return newAuthedUser(Role.ADMIN).headers();
	}
}
