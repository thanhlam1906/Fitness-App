package com.fitness.assistant.dto;

import java.util.UUID;

public record DocChunkResponse(UUID id, int ord, String heading, String content) {
}
