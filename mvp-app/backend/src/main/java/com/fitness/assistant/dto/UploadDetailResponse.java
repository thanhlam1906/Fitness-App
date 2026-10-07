package com.fitness.assistant.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UploadDetailResponse(UUID id, String fileName, String status, String error, Instant createdAt,
		ReplacesResponse replaces, List<ChunkPreviewResponse> chunks) {
}
