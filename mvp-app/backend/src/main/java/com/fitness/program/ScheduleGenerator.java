package com.fitness.program;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Template + tham số cá nhân + ngày nghỉ → lịch 4 tuần thật.
 * concept-backend-v1.md §7.1: lịch ĐẦU TIÊN sinh từ template và mức tạ khởi
 * điểm, không qua ProgressionEngine — tải giữ nguyên suốt cửa sổ sinh ra.
 * ProgressionEngine chỉ chỉnh tuần kế tiếp SAU khi có log thật (nơi khác gọi).
 *
 * Duyệt từng ngày lịch trong cửa sổ. Ngày nghỉ thì bỏ qua, không tiêu tốn vị
 * trí trong chu kỳ. Ngày tập thì gán entry kế tiếp của week_structure, cycle
 * quay vòng khi hết danh sách.
 */
public class ScheduleGenerator {

	public List<GeneratedWorkout> generate(
			List<CycleDay> weekStructure,
			Map<String, Double> startingLoadsBySlug,
			Set<DayOfWeek> restDays,
			LocalDate startDate,
			int weeksToGenerate) {

		List<GeneratedWorkout> result = new ArrayList<>();
		int cycleIndex = 0;
		LocalDate endExclusive = startDate.plusWeeks(weeksToGenerate);

		for (LocalDate date = startDate; date.isBefore(endExclusive); date = date.plusDays(1)) {
			if (restDays.contains(date.getDayOfWeek())) {
				continue;
			}
			CycleDay day = weekStructure.get(cycleIndex % weekStructure.size());
			cycleIndex++;

			int weekIndex = (int) (java.time.temporal.ChronoUnit.DAYS.between(startDate, date) / 7) + 1;
			result.add(new GeneratedWorkout(date, weekIndex, day.label(),
					toGeneratedExercises(day.exercises(), startingLoadsBySlug)));
		}
		return result;
	}

	/**
	 * Lịch tự thiết kế: cấu trúc buổi gắn với THỨ trong tuần, nên tuần nào cũng
	 * tập đúng các thứ đã chọn — khác generate() quay vòng chu kỳ theo thứ tự
	 * các ngày tập thật sự diễn ra.
	 */
	public List<LocalDate> customDates(
			Set<DayOfWeek> trainingDays, LocalDate startDate, int weeksToGenerate) {
		List<LocalDate> dates = new ArrayList<>();
		LocalDate endExclusive = startDate.plusWeeks(weeksToGenerate);
		for (LocalDate date = startDate; date.isBefore(endExclusive); date = date.plusDays(1)) {
			if (trainingDays.contains(date.getDayOfWeek())) {
				dates.add(date);
			}
		}
		return dates;
	}

	private List<GeneratedExercise> toGeneratedExercises(
			List<CycleExercise> exercises, Map<String, Double> startingLoadsBySlug) {
		List<GeneratedExercise> out = new ArrayList<>();
		int orderIndex = 1;
		for (CycleExercise ex : exercises) {
			out.add(new GeneratedExercise(
					ex.exerciseSlug(),
					orderIndex++,
					ex.sets(),
					ex.repsMin(),
					ex.repsMax(),
					startingLoadsBySlug.get(ex.exerciseSlug()),
					ex.restSec()));
		}
		return out;
	}
}
