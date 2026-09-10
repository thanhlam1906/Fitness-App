package com.fitness.program;

import java.util.List;

/**
 * Một entry trong week_structure của program_templates. "order" là vị trí
 * trong chu kỳ luân phiên, KHÔNG phải thứ trong tuần — người dùng tự chọn
 * ngày nghỉ nên chu kỳ chạy độc lập với lịch tuần thật. concept-backend-v1.md §4.3.
 */
public record CycleDay(int order, String label, List<CycleExercise> exercises) {
}
