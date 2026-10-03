package com.fitness.feedback.controller;

import com.fitness.common.CurrentUser;
import com.fitness.feedback.dto.FeedbackRequest;
import com.fitness.feedback.dto.FeedbackResponse;
import com.fitness.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** concept-backend-v1.md §6 — "POST /feedback: nút 'góp ý này sai'". */
@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

	private final FeedbackService feedbackService;
	private final CurrentUser currentUser;

	public FeedbackController(FeedbackService feedbackService, CurrentUser currentUser) {
		this.feedbackService = feedbackService;
		this.currentUser = currentUser;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FeedbackResponse create(@Valid @RequestBody FeedbackRequest request) {
		return feedbackService.create(currentUser.id(), request);
	}
}
