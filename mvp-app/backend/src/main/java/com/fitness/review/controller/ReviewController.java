package com.fitness.review.controller;

import com.fitness.common.CurrentUser;
import com.fitness.review.dto.ReviewResponse;
import com.fitness.review.service.ReviewService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Màn 7–9 concept-frontend-v1.md, khối C. Không có endpoint nào TRẢ VỀ clip — kể cả cho admin (§7).
 * Clip là video, hoặc file .json toạ độ khớp từ màn camera (design-cham-form-llm-v1.md).
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

	private final ReviewService reviewService;
	private final CurrentUser currentUser;

	public ReviewController(ReviewService reviewService, CurrentUser currentUser) {
		this.reviewService = reviewService;
		this.currentUser = currentUser;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	public ReviewResponse create(
			@RequestParam(required = false) UUID exerciseId,
			@RequestParam(defaultValue = "false") boolean optIn,
			@RequestParam(required = false) List<String> viewpoints,
			@RequestPart("clips") List<MultipartFile> files) {
		return reviewService.create(currentUser.id(), exerciseId, optIn, viewpoints, files);
	}

	@GetMapping
	public List<ReviewResponse> list() {
		return reviewService.list(currentUser.id());
	}

	@GetMapping("/{id}")
	public ReviewResponse get(@PathVariable UUID id) {
		return reviewService.get(currentUser.id(), id);
	}
}
