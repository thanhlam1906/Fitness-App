package com.fitness.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.admin.dto.AdminOverviewResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.dto.AdminUserDetailResponse;
import com.fitness.admin.dto.AdminUserRowResponse;
import com.fitness.auth.entity.Role;
import com.fitness.profile.entity.Profile;
import com.fitness.profile.repository.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Màn 11 concept-frontend-v1.md — admin xem người dùng và hồ sơ, KHÔNG xem video. */
class AdminUserControllerIntegrationTest extends PostgresIntegrationTest {

	private static final ParameterizedTypeReference<AdminPageResponse<AdminUserRowResponse>> PAGE =
			new ParameterizedTypeReference<>() {
			};

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProfileRepository profiles;
	@Autowired
	private org.springframework.jdbc.core.JdbcTemplate jdbc;

	private AdminPageResponse<AdminUserRowResponse> page(HttpHeaders admin, String query) {
		return rest.exchange("/api/v1/admin/users?" + query, HttpMethod.GET, new HttpEntity<>(admin), PAGE).getBody();
	}

	/** `encodedQuery` đã mã hoá sẵn, gửi nguyên văn tới server. */
	private AdminPageResponse<AdminUserRowResponse> pageUri(HttpHeaders admin, String encodedQuery) {
		return rest.exchange(java.net.URI.create(rest.getRootUri() + "/api/v1/admin/users?" + encodedQuery),
				HttpMethod.GET, new HttpEntity<>(admin), PAGE).getBody();
	}

	/** User có họ tên chứa `tag` để lọc riêng ra khỏi dữ liệu các test khác trong cùng DB. */
	private UUID userTagged(String tag, String fullName) {
		UUID id = newAuthedUser(Role.USER).userId();
		Profile profile = new Profile(id);
		profile.applyRegistration(fullName + " " + tag, null);
		profiles.save(profile);
		return id;
	}

	private void addSession(UUID userId, String startedAtSql) {
		jdbc.update("insert into workout_sessions (user_id, started_at, status) values (?, " + startedAtSql + ", 'DONE')",
				userId);
	}

	@Test
	void regularUser_cannotListUsers() {
		HttpHeaders user = newAuthedUser(Role.USER).headers();

		var resp = rest.exchange("/api/v1/admin/users", HttpMethod.GET, new HttpEntity<>(user), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void admin_seesUserAndProfileDetail() {
		var target = newAuthedUser(Role.USER);
		Profile profile = new Profile(target.userId());
		profile.patch("FAT_LOSS", "1_3Y", (short) 3, new String[] {"DUMBBELL"}, (short) 1990, "M", true, "DONE");
		profiles.save(profile);

		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var detail = rest.exchange("/api/v1/admin/users/" + target.userId(), HttpMethod.GET,
				new HttpEntity<>(admin), AdminUserDetailResponse.class).getBody();
		assertThat(detail.goal()).isEqualTo("FAT_LOSS");
		assertThat(detail.equipment()).containsExactly("DUMBBELL");
		assertThat(detail.disclaimerAt()).isNotNull();
		assertThat(detail.mustChangePassword()).isFalse();
		// Chưa tập buổi nào — "hoạt động gần nhất" để trống, không phải ngày tham gia.
		assertThat(detail.user().lastActivityAt()).isNull();
	}

	@Test
	void admin_unknownUser_returns404() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var resp = rest.exchange("/api/v1/admin/users/" + UUID.randomUUID(), HttpMethod.GET,
				new HttpEntity<>(admin), String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void danhSach_locTheoTrangThai_timTheoTen_phanTrang() {
		String tag = "tag" + UUID.randomUUID().toString().substring(0, 8);
		UUID training = userTagged(tag, "An");
		addSession(training, "now() - interval '1 day'");
		UUID idle = userTagged(tag, "Bình");
		addSession(idle, "now() - interval '20 days'");
		UUID notStarted = userTagged(tag, "Chi");
		UUID locked = userTagged(tag, "Dũng");
		jdbc.update("update users set is_active = false where id = ?", locked);
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		assertThat(page(admin, "q=" + tag).total()).isEqualTo(4);
		assertThat(page(admin, "q=" + tag + "&status=TRAINING").items()).extracting(AdminUserRowResponse::id)
				.containsExactly(training);
		assertThat(page(admin, "q=" + tag + "&status=IDLE").items()).extracting(AdminUserRowResponse::id)
				.containsExactly(idle);
		assertThat(page(admin, "q=" + tag + "&status=NOT_STARTED").items()).extracting(AdminUserRowResponse::id)
				.containsExactly(notStarted);
		assertThat(page(admin, "q=" + tag + "&status=LOCKED").items()).extracting(AdminUserRowResponse::id)
				.containsExactly(locked);

		var first = page(admin, "q=" + tag + "&sort=email&dir=asc&size=3&page=0");
		var second = page(admin, "q=" + tag + "&sort=email&dir=asc&size=3&page=1");
		assertThat(first.items()).hasSize(3);
		assertThat(second.items()).hasSize(1);
		assertThat(first.total()).isEqualTo(4);

		var byActivity = page(admin, "q=" + tag + "&sort=lastActivityAt&dir=desc");
		// Null (chưa tập) luôn cuối, kể cả khi sắp giảm dần.
		assertThat(byActivity.items().get(0).id()).isEqualTo(training);
		assertThat(byActivity.items().get(1).id()).isEqualTo(idle);
	}

	@Test
	void danhSach_timTheoEmail_vaKyTuDaiDienLaChuThuong() {
		var target = newAuthedUser(Role.USER);
		String email = jdbc.queryForObject("select email from users where id = ?", String.class, target.userId());
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		// Truyền URI đã mã hoá sẵn: URL dạng chuỗi bị TestRestTemplate mã hoá lại %, làm %2B (dấu + trong
		// email test) và %25 tới server thành chữ "%2B", "%25". Query string trần coi + là khoảng trắng.
		assertThat(pageUri(admin, "q=" + email.replace("+", "%2B")).items()).extracting(AdminUserRowResponse::id)
				.containsExactly(target.userId());

		// "A%B" chỉ khớp tên có đúng dấu %, không khớp "AxB" như khi % bị coi là ký tự đại diện.
		String tag = "pct" + UUID.randomUUID().toString().substring(0, 8);
		UUID literal = userTagged(tag, "A%B");
		userTagged(tag, "AxB");
		assertThat(pageUri(admin, "q=A%25B%20" + tag).items()).extracting(AdminUserRowResponse::id)
				.containsExactly(literal);
	}

	@Test
	void danhSach_thamSoSai_400() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		for (String bad : List.of("status=WHATEVER", "role=ROOT", "sort=password", "dir=up", "size=101", "page=-1")) {
			var resp = rest.exchange("/api/v1/admin/users?" + bad, HttpMethod.GET, new HttpEntity<>(admin), String.class);
			assertThat(resp.getStatusCode()).as(bad).isEqualTo(HttpStatus.BAD_REQUEST);
		}
	}

	@Test
	void thongKe_khongDemAdmin() {
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		var before = rest.exchange("/api/v1/admin/overview", HttpMethod.GET, new HttpEntity<>(admin),
				AdminOverviewResponse.class).getBody();

		newAuthedUser(Role.ADMIN);
		UUID trainee = newAuthedUser(Role.USER).userId();
		addSession(trainee, "now() - interval '1 hour'");

		var after = rest.exchange("/api/v1/admin/overview", HttpMethod.GET, new HttpEntity<>(admin),
				AdminOverviewResponse.class).getBody();
		assertThat(after.traineeCount() - before.traineeCount()).isEqualTo(1);
		assertThat(after.newTraineesLast7Days() - before.newTraineesLast7Days()).isEqualTo(1);
		assertThat(after.activeTraineesLast7Days() - before.activeTraineesLast7Days()).isEqualTo(1);
		assertThat(after.traineeSessionsLast7Days() - before.traineeSessionsLast7Days()).isEqualTo(1);
		// Tab đếm mọi tài khoản: thêm 1 admin + 1 người tập = +2.
		assertThat(after.statusCounts().get("ALL") - before.statusCounts().get("ALL")).isEqualTo(2);
	}

	@Test
	void xuatCsv_coBom_locDungNguoi() {
		String tag = "csv" + UUID.randomUUID().toString().substring(0, 8);
		userTagged(tag, "Hoa");
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var resp = rest.exchange("/api/v1/admin/users/export?q=" + tag, HttpMethod.GET, new HttpEntity<>(admin),
				byte[].class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getHeaders().getContentType().toString()).startsWith("text/csv");
		String body = new String(resp.getBody(), java.nio.charset.StandardCharsets.UTF_8);
		assertThat(body).startsWith("﻿ho_ten,");
		assertThat(body.split("\r\n")).hasSize(2);
		assertThat(body).contains("Hoa " + tag);
	}
}
