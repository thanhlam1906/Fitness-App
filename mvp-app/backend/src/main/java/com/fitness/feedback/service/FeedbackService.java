package com.fitness.feedback.service;

import com.fitness.assistant.repository.AssistantMessageRepository;
import com.fitness.feedback.dto.FeedbackRequest;
import com.fitness.feedback.dto.FeedbackResponse;
import com.fitness.feedback.entity.CueFeedback;
import com.fitness.feedback.repository.CueFeedbackRepository;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.review.repository.ReviewResultRepository;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Nút "góp ý này sai": đúng một trong reviewResultId / loadDecisionId / assistantMessageId được điền. */
@Service
public class FeedbackService {

	private final CueFeedbackRepository repository;
	private final ReviewResultRepository reviewResults;
	private final LoadDecisionRepository loadDecisions;
	private final AssistantMessageRepository assistantMessages;

	public FeedbackService(
			CueFeedbackRepository repository, ReviewResultRepository reviewResults, LoadDecisionRepository loadDecisions,
			AssistantMessageRepository assistantMessages) {
		this.repository = repository;
		this.reviewResults = reviewResults;
		this.loadDecisions = loadDecisions;
		this.assistantMessages = assistantMessages;
	}

	public FeedbackResponse create(UUID userId, FeedbackRequest request) {
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
		boolean own = request.reviewResultId() != null
				? reviewResults.existsOwnedBy(request.reviewResultId(), userId)
				: request.loadDecisionId() != null
						? loadDecisions.existsByIdAndUserId(request.loadDecisionId(), userId)
						: assistantMessages.findById(request.assistantMessageId())
								.filter(m -> m.getUserId().equals(userId) && "ASSISTANT".equals(m.getRole()))
								.isPresent();
		if (!own) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy góp ý này");
		}
		CueFeedback saved = repository.save(new CueFeedback(
				userId, request.reviewResultId(), request.loadDecisionId(), request.assistantMessageId(),
				request.isWrong(), request.note()));
		return new FeedbackResponse(saved.getId());
	}
}
