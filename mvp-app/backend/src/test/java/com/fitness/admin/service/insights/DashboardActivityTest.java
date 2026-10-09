package com.fitness.admin.service.insights;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.fitness.admin.dto.AdminDashboardResponse.FormCheckStatResponse;
import com.fitness.admin.dto.AdminDashboardResponse.TimelinePointResponse;
import com.fitness.admin.service.insights.DashboardActivity.FeedbackDay;
import com.fitness.admin.service.insights.DashboardActivity.FormCheckCount;
import com.fitness.admin.service.insights.DashboardActivity.QuestionDay;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Tổng quan admin: top bài chấm form, góp ý bị báo sai và câu hỏi trợ lý theo từng điểm thời gian. */
class DashboardActivityTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 10, 9);
	private static final UUID U1 = UUID.randomUUID();
	private static final UUID U2 = UUID.randomUUID();

	private static DashboardActivity.Result compute(
			int days, List<FormCheckCount> checks, List<FeedbackDay> feedback, List<QuestionDay> questions) {
		return DashboardActivity.compute(TODAY, days, checks, feedback, questions);
	}

	@Test
	void sevenDays_oneZeroFilledPointPerDay_endingToday() {
		var r = compute(7, List.of(), List.of(), List.of());

		assertThat(r.timelineUnit()).isEqualTo("DAY");
		assertThat(r.timeline()).extracting(TimelinePointResponse::start)
				.containsExactly(TODAY.minusDays(6), TODAY.minusDays(5), TODAY.minusDays(4), TODAY.minusDays(3),
						TODAY.minusDays(2), TODAY.minusDays(1), TODAY);
		assertThat(r.timeline()).allMatch(p -> p.wrongForm() + p.wrongLoad() + p.wrongAssistant()
				+ p.questions() + p.askers() == 0);
		assertThat(r.formCheckTotal()).isZero();
		assertThat(r.topFormChecks()).isEmpty();
		assertThat(r.assistantAskers()).isZero();
	}

	@Test
	void feedback_landsOnItsDayBySource_andDaysOutsideRangeAreIgnored() {
		var r = compute(7, List.of(), List.of(
				new FeedbackDay(TODAY, "FORM", 2),
				new FeedbackDay(TODAY, "LOAD", 1),
				new FeedbackDay(TODAY.minusDays(6), "ASSISTANT", 3),
				new FeedbackDay(TODAY.minusDays(7), "FORM", 9)), List.of());

		assertThat(r.timeline().getLast()).extracting(TimelinePointResponse::wrongForm,
				TimelinePointResponse::wrongLoad, TimelinePointResponse::wrongAssistant).containsExactly(2, 1, 0);
		assertThat(r.timeline().getFirst().wrongAssistant()).isEqualTo(3);
		assertThat(r.timeline().stream().mapToInt(TimelinePointResponse::wrongForm).sum()).isEqualTo(2);
	}

	@Test
	void ninetyDays_thirteenWeeklyPoints_lastOneIsTheRunningWeek() {
		LocalDate first = TODAY.minusDays(89);
		var r = compute(90, List.of(), List.of(new FeedbackDay(TODAY, "FORM", 1),
				new FeedbackDay(first.plusDays(84), "FORM", 1),
				new FeedbackDay(first.plusDays(83), "FORM", 1)), List.of());

		assertThat(r.timelineUnit()).isEqualTo("WEEK");
		assertThat(r.timeline()).hasSize(13);
		assertThat(r.timeline().get(1).start()).isEqualTo(first.plusDays(7));
		assertThat(r.timeline().getLast().start()).isEqualTo(first.plusDays(84));
		assertThat(r.timeline().getLast().wrongForm()).isEqualTo(2);
		assertThat(r.timeline().get(11).wrongForm()).isEqualTo(1);
	}

	@Test
	void questions_sumPerPoint_askersAreDistinctPerPointAndOverall() {
		LocalDate first = TODAY.minusDays(89);
		// U1 hỏi hai ngày trong cùng tuần đầu: một người, năm câu. U2 hỏi ở tuần cuối.
		var r = compute(90, List.of(), List.of(), List.of(
				new QuestionDay(first, U1, 2),
				new QuestionDay(first.plusDays(3), U1, 3),
				new QuestionDay(first.plusDays(3), U2, 1),
				new QuestionDay(TODAY, U2, 4)));

		assertThat(r.timeline().getFirst()).extracting(TimelinePointResponse::questions, TimelinePointResponse::askers)
				.containsExactly(6, 2);
		assertThat(r.timeline().getLast()).extracting(TimelinePointResponse::questions, TimelinePointResponse::askers)
				.containsExactly(4, 1);
		assertThat(r.assistantAskers()).isEqualTo(2);
	}

	@Test
	void formChecks_topFiveByChecksThenName_totalCountsEveryExercise() {
		List<FormCheckCount> checks = List.of(
				new FormCheckCount(UUID.randomUUID(), "Plank", 1, 1),
				new FormCheckCount(UUID.randomUUID(), "Squat", 9, 4),
				new FormCheckCount(UUID.randomUUID(), "Deadlift", 5, 2),
				new FormCheckCount(UUID.randomUUID(), "Bench", 5, 3),
				new FormCheckCount(UUID.randomUUID(), "Lunge", 2, 2),
				new FormCheckCount(UUID.randomUUID(), "Hít đất", 3, 1));

		var r = compute(30, checks, List.of(), List.of());

		assertThat(r.formCheckTotal()).isEqualTo(25);
		assertThat(r.topFormChecks()).extracting(FormCheckStatResponse::name, FormCheckStatResponse::checks,
				FormCheckStatResponse::users)
				.containsExactly(tuple("Squat", 9, 4), tuple("Bench", 5, 3), tuple("Deadlift", 5, 2),
						tuple("Hít đất", 3, 1), tuple("Lunge", 2, 2));
	}
}
