package com.fitness.admin.service.insights;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.dto.AdminDashboardResponse.GoalCountResponse;
import com.fitness.admin.dto.AdminDashboardResponse.ProgramStatResponse;
import com.fitness.admin.service.insights.DashboardStats.TemplateRow;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Tổng quan admin: gộp buổi, buổi lỡ, người đang theo theo chương trình, và mục tiêu của họ. */
class DashboardStatsTest {

	private static final UUID A = UUID.randomUUID();
	private static final UUID B = UUID.randomUUID();
	private static final UUID OFF = UUID.randomUUID();

	private static final List<TemplateRow> TEMPLATES = List.of(
			new TemplateRow(A, "Template A", true),
			new TemplateRow(B, "Template B", true),
			new TemplateRow(OFF, "Đã tắt", false));

	private static AdminDashboardResponse compute(
			Map<UUID, Long> users, List<UUID> sessions, List<UUID> missed, Map<String, Long> goals) {
		return DashboardStats.compute(30, TEMPLATES, users, sessions, missed, goals);
	}

	@Test
	void programs_countDoneMissedAndUsersPerTemplate() {
		var r = compute(Map.of(A, 3L, B, 1L),
				Arrays.asList(A, A, A, B), Arrays.asList(A, B, B, B), Map.of());

		assertThat(r.sessions()).isEqualTo(4);
		assertThat(r.missedWorkouts()).isEqualTo(4);
		assertThat(r.programs()).extracting(ProgramStatResponse::templateId, ProgramStatResponse::users,
				ProgramStatResponse::done, ProgramStatResponse::missed)
				.containsExactly(tuple(A, 3, 3, 1), tuple(B, 1, 1, 3));
	}

	@Test
	void templateWithoutAnyActivity_staysListedWithZeros_butInactiveOneIsHidden() {
		var r = compute(Map.of(), List.of(), List.of(), Map.of());

		assertThat(r.programs()).extracting(ProgramStatResponse::templateId).containsExactly(A, B);
		assertThat(r.programs()).allMatch(p -> p.users() == 0 && p.done() == 0 && p.missed() == 0);
	}

	@Test
	void inactiveTemplate_showsUpOnceItHasData() {
		var r = compute(Map.of(OFF, 2L), List.of(), List.of(), Map.of());

		assertThat(r.programs()).extracting(ProgramStatResponse::templateId).contains(OFF);
	}

	@Test
	void customProgram_isOneExtraRow_onlyWhenItHasData() {
		var none = compute(Map.of(), List.of(), List.of(), Map.of());
		assertThat(none.programs()).noneMatch(p -> p.templateId() == null);

		// templateId null = lịch tự thiết kế hoặc buổi ngoài lịch (cùng quy ước trang Buổi tập).
		Map<UUID, Long> users = new HashMap<>();
		users.put(null, 2L);
		var r = compute(users, Arrays.asList((UUID) null, null, A), Arrays.asList((UUID) null), Map.of());

		ProgramStatResponse custom = r.programs().get(r.programs().size() - 1);
		assertThat(custom.templateId()).isNull();
		assertThat(custom.name()).isEqualTo("Lịch tự thiết kế");
		assertThat(custom.users()).isEqualTo(2);
		assertThat(custom.done()).isEqualTo(2);
		assertThat(custom.missed()).isEqualTo(1);
		assertThat(r.sessions()).isEqualTo(3);
	}

	@Test
	void goals_alwaysListedInFixedOrder_includingZeros() {
		var r = compute(Map.of(), List.of(), List.of(), Map.of("FAT_LOSS", 31L, "MUSCLE", 46L, "NONE", 3L));

		assertThat(r.goals()).containsExactly(
				new GoalCountResponse("MUSCLE", 46), new GoalCountResponse("FAT_LOSS", 31),
				new GoalCountResponse("STRENGTH", 0), new GoalCountResponse("GENERAL", 0),
				new GoalCountResponse("NONE", 3));
	}
}
