package com.fitness.assistant.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentRowResponse(UUID id, String title, String source, Instant ingestedAt, int chunkCount,
		int wrongCount) {
}
