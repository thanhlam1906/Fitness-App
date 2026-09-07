package com.fitness.program;

/**
 * Ánh xạ vào scheduled_exercises. targetReps lấy repsMin của CycleExercise
 * (sàn của khoảng rep) — "đủ rep mọi set" trong double progression nghĩa là
 * đạt ít nhất repsMin; chạm repsMax liên tục mới là tín hiệu tăng tải thật sự.
 * targetLoadKg null khi bài không có mức tạ khởi điểm (bodyweight, vd push-up).
 */
public record GeneratedExercise(
		String exerciseSlug,
		int orderIndex,
		int targetSets,
		int targetReps,
		Double targetLoadKg,
		int restSeconds) {
}
