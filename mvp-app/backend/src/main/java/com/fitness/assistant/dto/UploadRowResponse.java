package com.fitness.assistant.dto;

import java.time.Instant;
import java.util.UUID;

public record UploadRowResponse(UUID id, String fileName, String status, String error, Instant createdAt,
		ReplacesResponse replaces) {
}
