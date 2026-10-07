package com.fitness.program.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record TrainingDaysRequest(@NotNull List<Integer> days) {
}
