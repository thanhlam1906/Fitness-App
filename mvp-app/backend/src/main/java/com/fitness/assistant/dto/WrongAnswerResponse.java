package com.fitness.assistant.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WrongAnswerResponse(UUID messageId, String question, String answer, String note, Instant createdAt,
		List<Integer> chunkOrds) {
}
