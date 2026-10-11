package com.fitness.admin.service.insights;

import com.fitness.admin.dto.AdminDashboardResponse;
import com.fitness.admin.dto.AdminDashboardResponse.GoalCountResponse;
import com.fitness.admin.dto.AdminDashboardResponse.ProgramStatResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gộp số liệu trang Tổng quan. Hàm thuần, không DB. Buổi đã tập và buổi lỡ nhận cùng đầu vào với
 * trang Buổi tập (templateId của từng buổi) nên hai trang không lệch nhau.
 */
public final class DashboardStats {

	/** Thứ tự cố định để web tô màu theo mục tiêu. NONE = hồ sơ chưa chọn mục tiêu. */
	static final List<String> GOALS = List.of("MUSCLE", "FAT_LOSS", "STRENGTH", "GENERAL", "NONE");

	public record TemplateRow(UUID id, String name, boolean active) {
	}

	private DashboardStats() {
	}

	/**
	 * usersByTemplate và hai danh sách templateId có thể chứa null (lịch tự thiết kế, buổi ngoài lịch).
	 * Template đã tắt chỉ hiện khi còn dữ liệu; dòng "Lịch tự thiết kế" cũng vậy.
	 */
	public static AdminDashboardResponse compute(
			int days, List<TemplateRow> templates, Map<UUID, Long> usersByTemplate,
			List<UUID> sessionTemplateIds, List<UUID> missedTemplateIds, Map<String, Long> usersByGoal,
			DashboardActivity.Result activity) {
		// Map.of ném NPE khi get(null) nên chép sang HashMap, nơi null là khoá hợp lệ.
		Map<UUID, Long> users = new HashMap<>(usersByTemplate);
		List<ProgramStatResponse> programs = new ArrayList<>();
		for (TemplateRow t : templates) {
			ProgramStatResponse row = row(t.id(), t.name(), users, sessionTemplateIds, missedTemplateIds);
			if (t.active() || hasData(row)) {
				programs.add(row);
			}
		}
		ProgramStatResponse custom = row(null, WorkoutInsights.CUSTOM_PROGRAM, users,
				sessionTemplateIds, missedTemplateIds);
		if (hasData(custom)) {
			programs.add(custom);
		}
		List<GoalCountResponse> goals = GOALS.stream()
				.map(g -> new GoalCountResponse(g, usersByGoal.getOrDefault(g, 0L).intValue()))
				.toList();
		return new AdminDashboardResponse(days, sessionTemplateIds.size(), missedTemplateIds.size(), goals, programs,
				activity.formCheckTotal(), activity.topFormChecks(), activity.timelineUnit(), activity.timeline(),
				activity.assistantAskers());
	}

	private static ProgramStatResponse row(
			UUID templateId, String name, Map<UUID, Long> usersByTemplate,
			List<UUID> sessionTemplateIds, List<UUID> missedTemplateIds) {
		return new ProgramStatResponse(templateId, name,
				usersByTemplate.getOrDefault(templateId, 0L).intValue(),
				occurrences(sessionTemplateIds, templateId), occurrences(missedTemplateIds, templateId));
	}

	/** Collections.frequency so bằng equals nên đếm đúng cả khi templateId là null. */
	private static int occurrences(List<UUID> ids, UUID templateId) {
		return Collections.frequency(ids, templateId);
	}

	private static boolean hasData(ProgramStatResponse row) {
		return row.users() > 0 || row.done() > 0 || row.missed() > 0;
	}
}
