package com.fitness.assistant.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DocumentDetailResponse(UUID id, String title, String source, Instant ingestedAt, int chunkCount,
		int wrongCount, List<DocChunkResponse> chunks, List<WrongAnswerResponse> wrongAnswers) {
}
