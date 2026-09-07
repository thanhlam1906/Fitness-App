package com.fitness.program;

/** Một bài trong một CycleDay, đọc từ week_structure.exercises[]. */
public record CycleExercise(String exerciseSlug, int sets, int repsMin, int repsMax, int restSec) {
}
