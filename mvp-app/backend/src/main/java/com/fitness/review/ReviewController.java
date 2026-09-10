package com.fitness.review;

import com.fitness.common.CurrentUser;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.content.FormCheck;
import com.fitness.content.FormCheckRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Màn 7–9 concept-frontend-v1.md, khối C. Backend chỉ nhận clip và tạo dòng
 * PENDING; analyzer (process riêng) poll bảng, chấm, ghi review_results rồi
 * xoá clip. Không có endpoint nào TRẢ VỀ clip — kể cả cho admin (§7).
 */
@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

	private static final int MAX_CLIPS = 3;

	private final VideoReviewRequestRepository requests;
	private final VideoClipRepository clips;
	private final ReviewResultRepository results;
	private final ExerciseRepository exercises;
	private final FormCheckRepository formChecks;
	private final ClipStorage clipStorage;
	private final CurrentUser currentUser;
	private final int weeklyLimit;

	public ReviewController(
			VideoReviewRequestRepository requests, VideoClipRepository clips, ReviewResultRepository results,
			ExerciseRepository exercises, FormCheckRepository formChecks, ClipStorage clipStorage,
			CurrentUser currentUser, @Value("${app.review-weekly-limit}") int weeklyLimit) {
		this.requests = requests;
		this.clips = clips;
		this.results = results;
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.clipStorage = clipStorage;
		this.currentUser = currentUser;
		this.weeklyLimit = weeklyLimit;
	}

	/**
	 * C4 — opt-in bắt buộc và tường minh: không có optIn=true thì không nhận
	 * clip, chứ không mặc định đồng ý. Giới hạn lượt/tuần theo §6.2 (con số ở
	 * config, Q8 của đặc tả còn treo).
	 */
	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.ACCEPTED)
	@Transactional
	public ReviewResponse create(
			@RequestParam UUID exerciseId,
			@RequestParam(defaultValue = "false") boolean optIn,
			@RequestParam(required = false) List<String> viewpoints,
			@RequestPart("clips") List<MultipartFile> files) {

		if (!optIn) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần đồng ý gửi clip lên để chấm (optIn)");
		}
		if (files == null || files.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần ít nhất một clip");
		}
		if (files.size() > MAX_CLIPS) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tối đa " + MAX_CLIPS + " clip mỗi lần gửi");
		}
		Exercise exercise = exercises.findById(exerciseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
		if (!exercise.isAnalyzable()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài này chưa hỗ trợ chấm form");
		}
		UUID userId = currentUser.id();
		long usedThisWeek = requests.countByUserIdAndCreatedAtAfter(userId, Instant.now().minus(7, ChronoUnit.DAYS));
		if (usedThisWeek >= weeklyLimit) {
			throw new ResponseStatusException(
					HttpStatus.TOO_MANY_REQUESTS, "Đã dùng hết " + weeklyLimit + " lượt chấm trong 7 ngày qua");
		}

		VideoReviewRequest request = requests.save(new VideoReviewRequest(userId, exerciseId));
		for (int i = 0; i < files.size(); i++) {
			MultipartFile file = files.get(i);
			String viewpoint = viewpoints != null && i < viewpoints.size() ? viewpoints.get(i) : null;
			clips.save(new VideoClip(request.getId(), clipStorage.store(file), viewpoint, file.getSize()));
		}
		return toResponse(request, exercise);
	}

	@GetMapping
	public List<ReviewResponse> list() {
		List<VideoReviewRequest> mine = requests.findByUserIdOrderByCreatedAtDesc(currentUser.id());
		Map<UUID, Exercise> byId = exercises.findAllById(
				mine.stream().map(VideoReviewRequest::getExerciseId).distinct().toList())
				.stream().collect(Collectors.toMap(Exercise::getId, e -> e));
		return mine.stream().map(r -> toResponse(r, byId.get(r.getExerciseId()))).toList();
	}

	@GetMapping("/{id}")
	public ReviewResponse get(@PathVariable UUID id) {
		VideoReviewRequest request = requests.findByIdAndUserId(id, currentUser.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu chấm"));
		return toResponse(request, exercises.findById(request.getExerciseId()).orElse(null));
	}

	private ReviewResponse toResponse(VideoReviewRequest request, Exercise exercise) {
		List<ReviewResult> rows = results.findByRequestId(request.getId());
		Map<UUID, String> codeByFormCheck = formChecks.findByExerciseId(request.getExerciseId()).stream()
				.collect(Collectors.toMap(FormCheck::getId, FormCheck::getCode));

		List<ReviewResponse.CheckResult> checks = rows.stream()
				.map(r -> new ReviewResponse.CheckResult(
						r.getId(), codeByFormCheck.get(r.getFormCheckId()), r.getVerdict(),
						r.getConfidence(), r.getMeasured(), r.getCueTextVi(), r.isPrimary()))
				// lỗi quan trọng nhất lên đầu, phần còn lại giữ thứ tự ổn định theo code
				.sorted((a, b) -> a.isPrimary() == b.isPrimary()
						? String.valueOf(a.code()).compareTo(String.valueOf(b.code()))
						: Boolean.compare(b.isPrimary(), a.isPrimary()))
				.toList();

		return new ReviewResponse(
				request.getId(), request.getExerciseId(),
				exercise == null ? null : (exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn()),
				request.getStatus(), request.getRejectReason(), request.getError(),
				request.getCreatedAt(), request.getFinishedAt(),
				clips.findByRequestId(request.getId()).stream().map(VideoClip::getViewpoint).toList(),
				checks);
	}
}
