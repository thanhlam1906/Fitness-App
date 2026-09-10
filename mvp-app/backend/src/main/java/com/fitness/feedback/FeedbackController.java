package com.fitness.feedback;

import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * concept-backend-v1.md §6 — "POST /feedback: nút 'góp ý này sai', cho cả 2
 * nguồn". Đúng một trong reviewResultId / loadDecisionId được điền.
 */
@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

	public record FeedbackRequest(UUID reviewResultId, UUID loadDecisionId, boolean isWrong, String note) {
	}

	public record FeedbackResponse(UUID id) {
	}

	private final CueFeedbackRepository repository;
	private final CurrentUser currentUser;

	public FeedbackController(CueFeedbackRepository repository, CurrentUser currentUser) {
		this.repository = repository;
		this.currentUser = currentUser;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FeedbackResponse create(@Valid @RequestBody FeedbackRequest request) {
		boolean exactlyOne = (request.reviewResultId() == null) != (request.loadDecisionId() == null);
		if (!exactlyOne) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "Cần đúng một trong reviewResultId hoặc loadDecisionId");
		}
		CueFeedback saved = repository.save(new CueFeedback(
				currentUser.id(), request.reviewResultId(), request.loadDecisionId(),
				request.isWrong(), request.note()));
		return new FeedbackResponse(saved.getId());
	}
}
