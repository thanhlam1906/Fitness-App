package com.fitness.admin.service.insights;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.admin.dto.WorkoutInsightsResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.LoadDecisionResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.PainResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RepShortResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.RpeOverResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SkippedResponse;
import com.fitness.admin.dto.WorkoutInsightsResponse.SubstitutedResponse;
import com.fitness.admin.service.insights.WorkoutInsights.DecisionRow;
import com.fitness.admin.service.insights.WorkoutInsights.PainRow;
import com.fitness.admin.service.insights.WorkoutInsights.ScheduledRow;
import com.fitness.admin.service.insights.WorkoutInsights.SetRow;
import com.fitness.program.service.progression.ProgressionConfig;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** doc/design-trang-buoi-tap-v1.md §4, §8 — từng công thức của 6 khối. */
class WorkoutInsightsTest {

	private static final UUID SQUAT = UUID.randomUUID();
	private static final UUID BENCH = UUID.randomUUID();
	private static final UUID ROW = UUID.randomUUID();
	private static final UUID A = UUID.randomUUID();
	private static final UUID B = UUID.randomUUID();
	private static final Map<UUID, String> NAMES = Map.of(SQUAT, "Squat", BENCH, "Đẩy ngực", ROW, "Kéo cáp");
	private static final Map<UUID, String> TEMPLATE_NAMES = Map.of(A, "Template A", B, "Template B");
	// A dùng mặc định 8 + 1; B hạ mục tiêu xuống 7 nên RPE 9 đã là quá nặng.
	private static final Map<UUID, ProgressionConfig> CONFIGS = Map.of(
			A, ProgressionConfig.DEFAULT,
			B, new ProgressionConfig(7, 2, 1, 70, 2, 2, 10, Map.of()));

	@Test
	void skipped_rateAmongAllSets_hidesExercisesUnderTenSets() {
		UUID u1 = UUID.randomUUID();
		UUID u2 = UUID.randomUUID();
		var r = sets(null, concat(
				Collections.nCopies(6, logged(u1, A, SQUAT, 8, null, 8)),
				Collections.nCopies(3, skip(u1, A, SQUAT, "TIRED")),
				Collections.nCopies(1, skip(u2, A, SQUAT, "PAIN")),
				Collections.nCopies(9, skip(u1, A, BENCH, "TIRED")))).skipped();

		assertThat(r).containsExactly(new SkippedResponse(SQUAT, "Squat", 10, 4, 2, "TIRED"));
	}

	@Test
	void rpeOver_usesEachTemplatesOwnThreshold_andIgnoresMissingRpe() {
		UUID u = UUID.randomUUID();
		var r = sets(null, concat(
				Collections.nCopies(10, logged(u, A, SQUAT, 8, 9, 8)),
				Collections.nCopies(10, logged(u, B, SQUAT, 8, 9, 8)),
				Collections.nCopies(5, logged(u, B, SQUAT, 8, null, 8)))).rpeOver();

		assertThat(r).containsExactly(new RpeOverResponse(SQUAT, "Squat", 20, 10, 9.0));
	}

	@Test
	void rpeOver_sessionWithoutTemplate_usesDefaultThreshold() {
		UUID u = UUID.randomUUID();
		var r = sets(null, concat(
				Collections.nCopies(10, logged(u, null, SQUAT, 8, 10, null)),
				Collections.nCopies(10, logged(u, null, BENCH, 8, 9, null)))).rpeOver();

		assertThat(r).containsExactly(new RpeOverResponse(SQUAT, "Squat", 10, 10, 10.0));
	}

	@Test
	void repShort_comparesToScheduleFloor_ignoresSkippedAndUnscheduled() {
		UUID u = UUID.randomUUID();
		var r = sets(null, concat(
				Collections.nCopies(7, logged(u, A, SQUAT, 8, null, 8)),
				Collections.nCopies(3, logged(u, A, SQUAT, 6, null, 8)),
				Collections.nCopies(5, skip(u, A, SQUAT, "TIRED")),
				Collections.nCopies(5, logged(u, null, SQUAT, 2, null, null)))).repShort();

		assertThat(r).containsExactly(new RepShortResponse(SQUAT, "Squat", 10, 3, 7.4, 8.0));
	}

	@Test
	void substituted_countsPeople_notScheduleRows() {
		UUID u1 = UUID.randomUUID();
		UUID u2 = UUID.randomUUID();
		UUID u3 = UUID.randomUUID();
		List<ScheduledRow> rows = concat(
				Collections.nCopies(5, new ScheduledRow(u1, A, BENCH, SQUAT)),
				List.of(new ScheduledRow(u2, A, ROW, SQUAT)),
				Collections.nCopies(4, new ScheduledRow(u3, A, SQUAT, null)));

		var r = WorkoutInsights.compute(30, null, List.of(), rows, List.of(), List.of(), CONFIGS, NAMES, TEMPLATE_NAMES)
				.substituted();

		assertThat(r).containsExactly(new SubstitutedResponse(SQUAT, "Squat", 2, 3, "Đẩy ngực"));
	}

	@Test
	void substituted_switchingBackToOriginal_isNotASubstitution() {
		UUID u1 = UUID.randomUUID();
		UUID u2 = UUID.randomUUID();
		// u1 đổi SQUAT -> BENCH rồi đổi lại: dòng còn exerciseId = substitutedFrom = SQUAT.
		List<ScheduledRow> rows = List.of(
				new ScheduledRow(u1, A, SQUAT, SQUAT),
				new ScheduledRow(u2, A, BENCH, SQUAT));

		var r = WorkoutInsights.compute(30, null, List.of(), rows, List.of(), List.of(), CONFIGS, NAMES, TEMPLATE_NAMES)
				.substituted();

		assertThat(r).containsExactly(new SubstitutedResponse(SQUAT, "Squat", 1, 2, "Đẩy ngực"));
	}

	@Test
	void pain_groupsByArea_withMostFrequentExercise() {
		UUID u1 = UUID.randomUUID();
		UUID u2 = UUID.randomUUID();
		List<PainRow> rows = List.of(
				new PainRow(u1, A, "KNEE_L", 3, Set.of(SQUAT, BENCH)),
				new PainRow(u1, A, "KNEE_L", 5, Set.of(SQUAT)),
				new PainRow(u2, A, "LOWER_BACK", 2, Set.of(ROW)));

		var r = WorkoutInsights.compute(30, null, List.of(), List.of(), rows, List.of(), CONFIGS, NAMES, TEMPLATE_NAMES)
				.pain();

		assertThat(r).containsExactly(
				new PainResponse("KNEE_L", 2, 1, 4.0, "Squat"),
				new PainResponse("LOWER_BACK", 1, 1, 2.0, "Kéo cáp"));
	}

	@Test
	void loadDecisions_perTemplateWhenAll_perExerciseWhenFiltered() {
		List<DecisionRow> rows = List.of(
				new DecisionRow(A, SQUAT, "UP", "DOUBLE_PROGRESSION_ALL_REPS_MET"),
				new DecisionRow(A, SQUAT, "DOWN", "SETS_MISSED_TARGET"),
				new DecisionRow(A, BENCH, "HOLD", "RPE_ABOVE_TARGET"),
				new DecisionRow(B, SQUAT, "DOWN", "PAIN_REPORTED"),
				new DecisionRow(null, ROW, "UP", "DOUBLE_PROGRESSION_ALL_REPS_MET"));

		var all = WorkoutInsights.compute(30, null, List.of(), List.of(), List.of(), rows, CONFIGS, NAMES, TEMPLATE_NAMES)
				.loadDecisions();
		assertThat(all).containsExactly(
				new LoadDecisionResponse(B, "Template B", 0, 0, 1, "PAIN_REPORTED"),
				new LoadDecisionResponse(A, "Template A", 1, 1, 1, "SETS_MISSED_TARGET"),
				new LoadDecisionResponse(null, "Lịch tự thiết kế", 1, 0, 0, null));

		var onlyA = WorkoutInsights.compute(30, A, List.of(), List.of(), List.of(), rows, CONFIGS, NAMES, TEMPLATE_NAMES)
				.loadDecisions();
		assertThat(onlyA).containsExactly(
				new LoadDecisionResponse(SQUAT, "Squat", 1, 0, 1, "SETS_MISSED_TARGET"),
				new LoadDecisionResponse(BENCH, "Đẩy ngực", 0, 1, 0, null));
	}

	@Test
	void templateFilter_dropsSessionsOfOtherTemplatesAndUnscheduled() {
		UUID u = UUID.randomUUID();
		List<SetRow> rows = concat(
				Collections.nCopies(10, skip(u, A, SQUAT, "TIRED")),
				Collections.nCopies(10, skip(u, null, BENCH, "TIRED")),
				Collections.nCopies(10, skip(u, B, ROW, "TIRED")));

		assertThat(sets(A, rows).skipped()).extracting(SkippedResponse::exerciseId).containsExactly(SQUAT);
		assertThat(sets(null, rows).skipped()).hasSize(3);
	}

	@Test
	void eachBlock_keepsTenRows_highestRateFirst() {
		UUID u = UUID.randomUUID();
		List<SetRow> rows = new ArrayList<>();
		for (int skipped = 1; skipped <= 12; skipped++) {
			UUID exercise = UUID.randomUUID();
			rows.addAll(Collections.nCopies(skipped, skip(u, A, exercise, "TIRED")));
			rows.addAll(Collections.nCopies(12 - skipped, logged(u, A, exercise, 8, null, 8)));
		}

		assertThat(sets(null, rows).skipped()).extracting(SkippedResponse::skippedSets)
				.containsExactly(12, 11, 10, 9, 8, 7, 6, 5, 4, 3);
	}

	private static WorkoutInsightsResponse sets(UUID filter, List<SetRow> rows) {
		return WorkoutInsights.compute(30, filter, rows, List.of(), List.of(), List.of(), CONFIGS, NAMES, TEMPLATE_NAMES);
	}

	private static SetRow logged(UUID user, UUID template, UUID exercise, Integer reps, Integer rpe, Integer floor) {
		return new SetRow(user, template, exercise, false, null, reps, rpe, floor);
	}

	private static SetRow skip(UUID user, UUID template, UUID exercise, String reason) {
		return new SetRow(user, template, exercise, true, reason, null, null, 8);
	}

	@SafeVarargs
	private static <T> List<T> concat(List<? extends T>... parts) {
		List<T> out = new ArrayList<>();
		for (List<? extends T> part : parts) {
			out.addAll(part);
		}
		return out;
	}
}
