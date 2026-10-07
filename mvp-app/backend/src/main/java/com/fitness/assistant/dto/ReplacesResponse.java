package com.fitness.assistant.dto;

import java.time.Instant;

public record ReplacesResponse(String title, Instant ingestedAt, int chunkCount) {
}
