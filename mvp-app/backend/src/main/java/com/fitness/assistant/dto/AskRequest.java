package com.fitness.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record AskRequest(@NotBlank String question, UUID threadId) {
}
