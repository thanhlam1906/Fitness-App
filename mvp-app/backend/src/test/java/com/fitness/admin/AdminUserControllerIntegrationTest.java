package com.fitness.admin;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.auth.Role;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

/** Màn 11 concept-frontend-v1.md — admin xem người dùng và hồ sơ, KHÔNG xem video. */
class AdminUserControllerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private ProfileRepository profiles;

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

		var list = rest.exchange("/api/v1/admin/users", HttpMethod.GET,
				new HttpEntity<>(admin), AdminUserController.AdminUserRow[].class);
		assertThat(list.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(list.getBody()).extracting(AdminUserController.AdminUserRow::id).contains(target.userId());

		var detail = rest.exchange("/api/v1/admin/users/" + target.userId(), HttpMethod.GET,
				new HttpEntity<>(admin), AdminUserController.AdminUserDetail.class).getBody();
		assertThat(detail.goal()).isEqualTo("FAT_LOSS");
		assertThat(detail.equipment()).containsExactly("DUMBBELL");
		assertThat(detail.disclaimerAt()).isNotNull();
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
}
