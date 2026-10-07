package com.fitness.program.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SubstituteRequest(@NotNull UUID exerciseId) {
}
