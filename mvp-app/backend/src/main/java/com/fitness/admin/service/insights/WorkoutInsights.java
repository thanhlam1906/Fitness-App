package com.fitness.admin.service.insights;

import com.fitness.admin.dto.WorkoutInsightsResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.LoadDecisionResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.PainResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RepShortResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RpeOverResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SkippedResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SubstitutedResponse;
import com.fitness.program.service.progression.ProgressionConfig;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

/**
 * Gộp dòng thô thành 6 khối của trang "Buổi tập" (doc/design-trang-buoi-tap-v1.md §4). Hàm thuần,
 * không DB, để test từng công thức. Ngưỡng RPE lấy từ ProgressionConfig của template từng buổi nên
 * khối "RPE vượt mức" đếm đúng những lần RpeRule giữ tạ.
 *
 * ponytail: gộp trong bộ nhớ, tối đa 90 ngày dữ liệu. Khi dữ liệu lớn thì chuyển sang GROUP BY SQL.
 */
public final class WorkoutInsights {

	/** Bài có ít mẫu hơn thế trong khoảng thì ẩn: vài set lẻ đẩy tỉ lệ lên 100%. */
	static final int MIN_SETS = 10;
	static final int MAX_ROWS = 10;
	static final String CUSTOM_PROGRAM = "Lịch tự thiết kế";

	/** templateId null = buổi ngoài lịch hoặc lịch tự thiết kế. floorReps null = buổi không có lịch. */
	public record SetRow(
			UUID userId, UUID templateId, UUID exerciseId, boolean skipped, String skipReason,
			Integer reps, Integer rpe, Integer floorReps) {
	}

	/** Một bài trong lịch. substitutedFrom khác null = bài gốc substitutedFrom đã đổi sang exerciseId. */
	public record ScheduledRow(UUID userId, UUID templateId, UUID exerciseId, UUID substitutedFrom) {
	}

	/** Một lần báo đau, kèm các bài đã ghi set trong buổi đó. */
	public record PainRow(UUID userId, UUID templateId, String bodyArea, int severity, Set<UUID> exerciseIds) {
	}

	public record DecisionRow(UUID templateId, UUID exerciseId, String direction, String ruleId) {
	}

	private WorkoutInsights() {
	}

	public static WorkoutInsightsResponse compute(
			int days, UUID templateId,
			List<SetRow> sets, List<ScheduledRow> scheduled, List<PainRow> pains, List<DecisionRow> decisions,
			Map<UUID, ProgressionConfig> configs, Map<UUID, String> exerciseNames, Map<UUID, String> templateNames) {
		Function<UUID, String> name = id -> id == null ? null : exerciseNames.getOrDefault(id, "?");
		List<SetRow> s = sets.stream().filter(r -> matches(templateId, r.templateId())).toList();
		return new WorkoutInsightsResponse(
				days, templateId,
				skipped(s, name),
				rpeOver(s, configs, name),
				repShort(s, name),
				substituted(scheduled.stream().filter(r -> matches(templateId, r.templateId())).toList(), name),
				pain(pains.stream().filter(r -> matches(templateId, r.templateId())).toList(), name),
				loadDecisions(
						decisions.stream().filter(r -> matches(templateId, r.templateId())).toList(),
						templateId != null, name, templateNames));
	}

	/** Lọc một template thì buổi ngoài lịch (template null) không thuộc về nó. */
	private static boolean matches(UUID filter, UUID templateId) {
		return filter == null || filter.equals(templateId);
	}

	private static List<SkippedResponse> skipped(List<SetRow> sets, Function<UUID, String> name) {
		List<SkippedResponse> out = new ArrayList<>();
		groupBy(sets, SetRow::exerciseId).forEach((exerciseId, rows) -> {
			List<SetRow> skippedRows = rows.stream().filter(SetRow::skipped).toList();
			if (rows.size() < MIN_SETS || skippedRows.isEmpty()) {
				return;
			}
			out.add(new SkippedResponse(
					exerciseId, name.apply(exerciseId), rows.size(), skippedRows.size(),
					distinct(skippedRows, SetRow::userId), mostCommon(skippedRows, SetRow::skipReason)));
		});
		return top(out, r -> ratio(r.skippedSets(), r.sets()), SkippedResponse::skippedSets,
				SkippedResponse::exerciseName);
	}

	private static List<RpeOverResponse> rpeOver(
			List<SetRow> sets, Map<UUID, ProgressionConfig> configs, Function<UUID, String> name) {
		List<RpeOverResponse> out = new ArrayList<>();
		List<SetRow> rated = sets.stream().filter(r -> !r.skipped() && r.rpe() != null).toList();
		groupBy(rated, SetRow::exerciseId).forEach((exerciseId, rows) -> {
			int over = (int) rows.stream().filter(r -> {
				ProgressionConfig c = configFor(configs, r.templateId());
				return r.rpe() > c.targetRpe() + c.rpeOver();
			}).count();
			if (rows.size() < MIN_SETS || over == 0) {
				return;
			}
			double avg = rows.stream().mapToInt(SetRow::rpe).average().orElse(0);
			out.add(new RpeOverResponse(exerciseId, name.apply(exerciseId), rows.size(), over, round1(avg)));
		});
		return top(out, r -> ratio(r.overCount(), r.rpeLogs()), RpeOverResponse::overCount,
				RpeOverResponse::exerciseName);
	}

	/** Map.of ném NPE khi get(null), nên template null xử lý trước. */
	private static ProgressionConfig configFor(Map<UUID, ProgressionConfig> configs, UUID templateId) {
		return templateId == null
				? ProgressionConfig.DEFAULT
				: configs.getOrDefault(templateId, ProgressionConfig.DEFAULT);
	}

	/** So với SÀN của lịch, cùng nghĩa "hụt rep thật" của ProgressionSignals. Set bỏ không tính. */
	private static List<RepShortResponse> repShort(List<SetRow> sets, Function<UUID, String> name) {
		List<RepShortResponse> out = new ArrayList<>();
		List<SetRow> logged = sets.stream()
				.filter(r -> !r.skipped() && r.reps() != null && r.floorReps() != null)
				.toList();
		groupBy(logged, SetRow::exerciseId).forEach((exerciseId, rows) -> {
			int shortSets = (int) rows.stream().filter(r -> r.reps() < r.floorReps()).count();
			if (rows.size() < MIN_SETS || shortSets == 0) {
				return;
			}
			out.add(new RepShortResponse(
					exerciseId, name.apply(exerciseId), rows.size(), shortSets,
					round1(rows.stream().mapToInt(SetRow::reps).average().orElse(0)),
					round1(rows.stream().mapToInt(SetRow::floorReps).average().orElse(0))));
		});
		return top(out, r -> ratio(r.shortSets(), r.sets()), RepShortResponse::shortSets,
				RepShortResponse::exerciseName);
	}

	private static List<SubstitutedResponse> substituted(List<ScheduledRow> rows, Function<UUID, String> name) {
		// Người có bài gốc trong lịch: dòng chưa đổi của bài đó, hoặc dòng đã đổi từ bài đó.
		Map<UUID, Set<UUID>> scheduledUsers = new HashMap<>();
		for (ScheduledRow r : rows) {
			UUID original = r.substitutedFrom() != null ? r.substitutedFrom() : r.exerciseId();
			scheduledUsers.computeIfAbsent(original, k -> new HashSet<>()).add(r.userId());
		}
		List<SubstitutedResponse> out = new ArrayList<>();
		// Đổi A -> B rồi B -> A thì dòng còn substitutedFrom = exerciseId = A: người đó đã quay về bài gốc, không tính là đổi.
		List<ScheduledRow> swapped = rows.stream()
				.filter(r -> r.substitutedFrom() != null && !r.substitutedFrom().equals(r.exerciseId()))
				.toList();
		groupBy(swapped, ScheduledRow::substitutedFrom).forEach((original, rs) -> out.add(new SubstitutedResponse(
				original, name.apply(original), distinct(rs, ScheduledRow::userId),
				scheduledUsers.get(original).size(), name.apply(mostCommon(rs, ScheduledRow::exerciseId)))));
		return top(out, r -> ratio(r.usersSubstituted(), r.usersScheduled()), SubstitutedResponse::usersSubstituted,
				SubstitutedResponse::exerciseName);
	}

	private static List<PainResponse> pain(List<PainRow> rows, Function<UUID, String> name) {
		List<PainResponse> out = new ArrayList<>();
		groupBy(rows, PainRow::bodyArea).forEach((area, rs) -> {
			List<UUID> exercises = rs.stream().flatMap(r -> r.exerciseIds().stream()).toList();
			out.add(new PainResponse(
					area, rs.size(), distinct(rs, PainRow::userId),
					round1(rs.stream().mapToInt(PainRow::severity).average().orElse(0)),
					name.apply(mostCommon(exercises, id -> id))));
		});
		return top(out, PainResponse::reports, PainResponse::users, PainResponse::bodyArea);
	}

	private static List<LoadDecisionResponse> loadDecisions(
			List<DecisionRow> rows, boolean byExercise, Function<UUID, String> exerciseName,
			Map<UUID, String> templateNames) {
		Function<DecisionRow, UUID> key = byExercise ? DecisionRow::exerciseId : DecisionRow::templateId;
		List<LoadDecisionResponse> out = new ArrayList<>();
		groupBy(rows, key).forEach((k, rs) -> {
			String label = byExercise
					? exerciseName.apply(k)
					: (k == null ? CUSTOM_PROGRAM : templateNames.getOrDefault(k, "?"));
			List<DecisionRow> down = rs.stream().filter(r -> r.direction().equals("DOWN")).toList();
			out.add(new LoadDecisionResponse(
					k, label, count(rs, "UP"), count(rs, "HOLD"), down.size(),
					mostCommon(down, DecisionRow::ruleId)));
		});
		return top(out, r -> ratio(r.down(), r.up() + r.hold() + r.down()), LoadDecisionResponse::down,
				LoadDecisionResponse::name);
	}

	private static int count(List<DecisionRow> rows, String direction) {
		return (int) rows.stream().filter(r -> r.direction().equals(direction)).count();
	}

	/** Tự gộp thay Collectors.groupingBy vì khoá có thể null (template null). Giữ thứ tự gặp. */
	private static <T, K> Map<K, List<T>> groupBy(List<T> rows, Function<T, K> key) {
		Map<K, List<T>> map = new LinkedHashMap<>();
		for (T row : rows) {
			map.computeIfAbsent(key.apply(row), k -> new ArrayList<>()).add(row);
		}
		return map;
	}

	private static <T> int distinct(List<T> rows, Function<T, UUID> key) {
		return (int) rows.stream().map(key).distinct().count();
	}

	/** Giá trị gặp nhiều nhất, hoà thì lấy cái gặp trước. Rỗng thì null. */
	private static <T, K> K mostCommon(Collection<T> rows, Function<T, K> key) {
		return rows.stream().map(key).filter(Objects::nonNull)
				.collect(Collectors.groupingBy(k -> k, LinkedHashMap::new, Collectors.counting()))
				.entrySet().stream()
				.max(Map.Entry.comparingByValue())
				.map(Map.Entry::getKey)
				.orElse(null);
	}

	private static <T> List<T> top(
			List<T> rows, ToDoubleFunction<T> rate, ToIntFunction<T> count, Function<T, String> name) {
		Comparator<T> order = Comparator.comparingDouble(rate).reversed();
		order = order.thenComparing(Comparator.comparingInt(count).reversed());
		order = order.thenComparing(name, Comparator.nullsLast(Comparator.<String>naturalOrder()));
		return rows.stream().sorted(order).limit(MAX_ROWS).toList();
	}

	private static double ratio(int part, int whole) {
		return whole == 0 ? 0 : (double) part / whole;
	}

	private static double round1(double value) {
		return Math.round(value * 10) / 10.0;
	}
}
