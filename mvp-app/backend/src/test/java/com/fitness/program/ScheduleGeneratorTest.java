package com.fitness.program;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleGeneratorTest {

	private final ScheduleGenerator generator = new ScheduleGenerator();

	/** Thứ Hai xác định bằng code, không đoán ngày thật — test không phụ thuộc lịch hôm nay. */
	private static LocalDate aMonday() {
		return LocalDate.of(2026, 1, 1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
	}

	@Test
	void cyclesThroughWeekStructureAcrossNonRestDays() {
		List<CycleDay> weekStructure = List.of(
				new CycleDay(1, "A", List.of()),
				new CycleDay(2, "B", List.of()));
		LocalDate start = aMonday();

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, Map.of(), Set.of(), start, 1);

		assertThat(result).hasSize(7);
		assertThat(result.stream().map(GeneratedWorkout::label))
				.containsExactly("A", "B", "A", "B", "A", "B", "A");
		assertThat(result.get(0).scheduledOn()).isEqualTo(start);
		assertThat(result.get(6).scheduledOn()).isEqualTo(start.plusDays(6));
	}

	@Test
	void skipsConfiguredRestDays() {
		List<CycleDay> weekStructure = List.of(
				new CycleDay(1, "A", List.of()),
				new CycleDay(2, "B", List.of()));
		LocalDate start = aMonday();

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, Map.of(), Set.of(DayOfWeek.WEDNESDAY, DayOfWeek.SUNDAY), start, 1);

		// 7 ngày - 2 ngày nghỉ (T4, CN) = 5 buổi
		assertThat(result).hasSize(5);
		assertThat(result).noneMatch(w -> w.scheduledOn().getDayOfWeek() == DayOfWeek.WEDNESDAY);
		assertThat(result).noneMatch(w -> w.scheduledOn().getDayOfWeek() == DayOfWeek.SUNDAY);
		// cycle KHÔNG bị lệch bởi ngày nghỉ — vẫn A,B,A,B,A theo đúng thứ tự các buổi thật sự diễn ra
		assertThat(result.stream().map(GeneratedWorkout::label))
				.containsExactly("A", "B", "A", "B", "A");
	}

	@Test
	void mapsExerciseFieldsPreservingOrderAndUsingRepsMinAsTarget() {
		List<CycleDay> weekStructure = List.of(
				new CycleDay(1, "A", List.of(
						new CycleExercise("barbell-back-squat", 3, 5, 5, 180),
						new CycleExercise("overhead-press", 3, 6, 8, 150))));
		LocalDate start = aMonday();

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, Map.of(), Set.of(), start, 1);

		GeneratedExercise first = result.get(0).exercises().get(0);
		GeneratedExercise second = result.get(0).exercises().get(1);

		assertThat(first.exerciseSlug()).isEqualTo("barbell-back-squat");
		assertThat(first.orderIndex()).isEqualTo(1);
		assertThat(first.targetSets()).isEqualTo(3);
		assertThat(first.targetReps()).isEqualTo(5);   // repsMin, không phải repsMax
		assertThat(first.restSeconds()).isEqualTo(180);

		assertThat(second.exerciseSlug()).isEqualTo("overhead-press");
		assertThat(second.orderIndex()).isEqualTo(2);
		assertThat(second.targetReps()).isEqualTo(6);  // repsMin của khoảng 6-8
	}

	@Test
	void setsTargetLoadFromStartingLoadsMap_nullWhenSlugAbsent() {
		List<CycleDay> weekStructure = List.of(
				new CycleDay(1, "A", List.of(
						new CycleExercise("barbell-back-squat", 3, 5, 5, 180),
						new CycleExercise("push-up", 3, 8, 15, 90))));
		LocalDate start = aMonday();
		Map<String, Double> startingLoads = Map.of("barbell-back-squat", 60.0);

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, startingLoads, Set.of(), start, 1);

		List<GeneratedExercise> exercises = result.get(0).exercises();
		assertThat(exercises.get(0).targetLoadKg()).isEqualTo(60.0);
		assertThat(exercises.get(1).targetLoadKg()).isNull();  // push-up: bodyweight, không có mức khởi điểm
	}

	@Test
	void weekIndexReflectsCalendarWeekSinceStart_oneBased() {
		List<CycleDay> weekStructure = List.of(new CycleDay(1, "A", List.of()));
		LocalDate start = aMonday();

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, Map.of(), Set.of(), start, 2);

		assertThat(result).hasSize(14);
		assertThat(result.subList(0, 7)).allMatch(w -> w.weekIndex() == 1);
		assertThat(result.subList(7, 14)).allMatch(w -> w.weekIndex() == 2);
	}

	@Test
	void generatesExactlyRequestedWindow_notBeyond() {
		List<CycleDay> weekStructure = List.of(new CycleDay(1, "A", List.of()));
		LocalDate start = aMonday();

		List<GeneratedWorkout> result = generator.generate(
				weekStructure, Map.of(), Set.of(), start, 1);

		assertThat(result).hasSize(7);
		assertThat(result.get(6).scheduledOn()).isEqualTo(start.plusDays(6));
	}

	@Test
	void customDates_repeatsChosenWeekdaysEveryWeek() {
		LocalDate start = aMonday();

		List<LocalDate> dates = generator.customDates(
				Set.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY), start, 2);

		// 2 thứ × 2 tuần = 4 buổi, đúng thứ đã chọn, không quay vòng chu kỳ.
		assertThat(dates).containsExactly(
				start, start.plusDays(3), start.plusWeeks(1), start.plusWeeks(1).plusDays(3));
	}

	@Test
	void customDates_startingMidWeek_onlyCountsDaysInsideTheWindow() {
		LocalDate wednesday = aMonday().plusDays(2);

		List<LocalDate> dates = generator.customDates(
				Set.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY), wednesday, 1);

		// Cửa sổ là 7 ngày kể từ ngày bắt đầu: T4 (hôm nay) và T2 tuần sau.
		assertThat(dates).containsExactly(wednesday, wednesday.plusDays(5));
	}
}
