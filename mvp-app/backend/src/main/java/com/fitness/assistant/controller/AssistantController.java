package com.fitness.assistant.controller;

import com.fitness.assistant.dto.AskRequest;
import com.fitness.assistant.dto.AskResponse;
import com.fitness.assistant.service.AssistantService;
import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Màn trợ lý — concept-chatbot-v1.md §12. Tab phụ, không phải màn mở đầu (đó vẫn là Lịch tuần). */
@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

	private final AssistantService assistantService;
	private final CurrentUser currentUser;

	public AssistantController(AssistantService assistantService, CurrentUser currentUser) {
		this.assistantService = assistantService;
		this.currentUser = currentUser;
	}

	@PostMapping("/messages")
	public AskResponse ask(@Valid @RequestBody AskRequest request) {
		return assistantService.ask(currentUser.id(), request);
	}
}
