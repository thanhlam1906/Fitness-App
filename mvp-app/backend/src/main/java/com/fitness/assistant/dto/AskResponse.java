package com.fitness.assistant.dto;

import java.util.List;
import java.util.UUID;

public record AskResponse(
		UUID messageId, String answer, boolean blocked, UUID threadId, List<String> sourceTitles,
		List<String> toolsCalled, String guardResult) {
}
