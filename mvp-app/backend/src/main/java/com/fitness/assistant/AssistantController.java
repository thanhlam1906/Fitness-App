package com.fitness.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Màn trợ lý — concept-chatbot-v1.md §12. Tab phụ, không phải màn mở đầu (đó vẫn là Lịch tuần). */
@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

	private final AssistantService assistantService;

	public AssistantController(AssistantService assistantService) {
		this.assistantService = assistantService;
	}

	public record AskRequest(@NotBlank String question, UUID threadId) {
	}

	public record AskResponse(
			String answer, boolean blocked, UUID threadId, List<String> sourceTitles, List<String> toolsCalled,
			String guardResult) {
	}

	@PostMapping("/messages")
	public AskResponse ask(@Valid @RequestBody AskRequest request) {
		UUID threadId = request.threadId() != null ? request.threadId() : UUID.randomUUID();
		AssistantService.Answer answer = assistantService.ask(threadId, request.question());
		return new AskResponse(
				answer.text(), answer.blocked(), threadId, answer.sourceTitles(), answer.toolsCalled(),
				answer.guardResult());
	}
}
