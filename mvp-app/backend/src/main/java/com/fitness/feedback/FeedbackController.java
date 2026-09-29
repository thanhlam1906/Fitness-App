package com.fitness.feedback;

import com.fitness.assistant.AssistantMessageRepository;
import com.fitness.common.CurrentUser;
import com.fitness.program.LoadDecisionRepository;
import com.fitness.review.ReviewResultRepository;
import jakarta.validation.Valid;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * concept-backend-v1.md §6 — "POST /feedback: nút 'góp ý này sai'". Đúng một trong
 * reviewResultId / loadDecisionId / assistantMessageId được điền.
 */
@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

	public record FeedbackRequest(
			UUID reviewResultId, UUID loadDecisionId, UUID assistantMessageId, boolean isWrong, String note) {
	}

	public record FeedbackResponse(UUID id) {
	}

	private final CueFeedbackRepository repository;
	private final ReviewResultRepository reviewResults;
	private final LoadDecisionRepository loadDecisions;
	private final AssistantMessageRepository assistantMessages;
	private final CurrentUser currentUser;

	public FeedbackController(
			CueFeedbackRepository repository, ReviewResultRepository reviewResults, LoadDecisionRepository loadDecisions,
			AssistantMessageRepository assistantMessages, CurrentUser currentUser) {
		this.repository = repository;
		this.reviewResults = reviewResults;
		this.loadDecisions = loadDecisions;
		this.assistantMessages = assistantMessages;
		this.currentUser = currentUser;
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public FeedbackResponse create(@Valid @RequestBody FeedbackRequest request) {
		long sources = Stream.of(request.reviewResultId(), request.loadDecisionId(), request.assistantMessageId())
				.filter(Objects::nonNull)
				.count();
		if (sources != 1) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Cần đúng một trong reviewResultId, loadDecisionId hoặc assistantMessageId");
		}
		// Chỉ góp ý được vào thứ của chính mình — 404 chứ không 403, không xác nhận thứ của người
		// khác tồn tại (concept-backend-v1.md §5 Lớp 3). Trước đây hai nguồn đầu không kiểm: B ghi
		// góp ý lên kết quả của A (bẩn số liệu admin), id không có thật thì 500.
		UUID me = currentUser.id();
		boolean own = request.reviewResultId() != null
				? reviewResults.existsOwnedBy(request.reviewResultId(), me)
				: request.loadDecisionId() != null
						? loadDecisions.existsByIdAndUserId(request.loadDecisionId(), me)
						: assistantMessages.findById(request.assistantMessageId())
								.filter(m -> m.getUserId().equals(me) && "ASSISTANT".equals(m.getRole()))
								.isPresent();
		if (!own) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy góp ý này");
		}
		CueFeedback saved = repository.save(new CueFeedback(
				currentUser.id(), request.reviewResultId(), request.loadDecisionId(), request.assistantMessageId(),
				request.isWrong(), request.note()));
		return new FeedbackResponse(saved.getId());
	}
}
