package com.fitness.program;

/**
 * Ánh xạ vào scheduled_exercises. targetReps lấy repsMin của CycleExercise
 * (sàn của khoảng rep) — "đủ rep mọi set" trong double progression nghĩa là
 * đạt ít nhất repsMin; targetRepsMax (trần) là tín hiệu tăng tải thật sự,
 * dùng bởi ProgressionSignalBuilder khi buổi tập kết thúc.
 * targetLoadKg null khi bài không có mức tạ khởi điểm (bodyweight, vd push-up).
 */
public record GeneratedExercise(
		String exerciseSlug,
		int orderIndex,
		int targetSets,
		int targetReps,
		int targetRepsMax,
		Double targetLoadKg,
		int restSeconds) {
}
