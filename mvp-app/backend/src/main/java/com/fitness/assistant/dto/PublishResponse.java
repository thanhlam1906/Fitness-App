package com.fitness.assistant.dto;

import java.util.UUID;

public record PublishResponse(UUID documentId, int chunkCount) {
}
