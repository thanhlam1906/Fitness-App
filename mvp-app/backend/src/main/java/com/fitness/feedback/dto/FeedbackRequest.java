package com.fitness.feedback.dto;

import java.util.UUID;

public record FeedbackRequest(
		UUID reviewResultId, UUID loadDecisionId, UUID assistantMessageId, boolean isWrong, String note) {
}
