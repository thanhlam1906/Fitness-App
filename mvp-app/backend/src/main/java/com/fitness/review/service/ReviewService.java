package com.fitness.review.service;

import com.fitness.content.entity.Exercise;
import com.fitness.content.entity.FormCheck;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.content.repository.FormCheckRepository;
import com.fitness.review.dto.ChangeExerciseRequest;
import com.fitness.review.dto.ReviewResponse;
import com.fitness.review.entity.ReviewResult;
import com.fitness.review.entity.VideoClip;
import com.fitness.review.entity.VideoReviewRequest;
import com.fitness.review.repository.ReviewResultRepository;
import com.fitness.review.repository.VideoClipRepository;
import com.fitness.review.repository.VideoReviewRequestRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Khối C: backend chỉ nhận clip và tạo dòng PENDING; analyzer (process riêng) poll bảng, chấm, ghi
 * review_results rồi xoá clip. Không hàm nào TRẢ VỀ clip — kể cả cho admin (§7).
 */
@Service
public class ReviewService {

	private static final int MAX_CLIPS = 3;
	// Nặng trước nhẹ sau: người dùng đọc lỗi trước, mục đạt cuối cùng.
	private static final List<String> SEVERITY = List.of("FAIL", "WARN", "LOW_CONFIDENCE", "NOT_APPLICABLE", "PASS");
	private static final Comparator<ReviewResponse.CheckResultResponse> CHECK_ORDER = Comparator
			.comparing(ReviewResponse.CheckResultResponse::isPrimary).reversed()
			.thenComparingInt(c -> SEVERITY.indexOf(c.verdict()))
			.thenComparing(c -> String.valueOf(c.name() != null ? c.name() : c.code()));

	private final VideoReviewRequestRepository requests;
	private final VideoClipRepository clips;
	private final ReviewResultRepository results;
	private final ExerciseRepository exercises;
	private final FormCheckRepository formChecks;
	private final ClipStorage clipStorage;
	private final int weeklyLimit;

	public ReviewService(
			VideoReviewRequestRepository requests, VideoClipRepository clips, ReviewResultRepository results,
			ExerciseRepository exercises, FormCheckRepository formChecks, ClipStorage clipStorage,
			@Value("${app.review-weekly-limit}") int weeklyLimit) {
		this.requests = requests;
		this.clips = clips;
		this.results = results;
		this.exercises = exercises;
		this.formChecks = formChecks;
		this.clipStorage = clipStorage;
		this.weeklyLimit = weeklyLimit;
	}

	/**
	 * C4 — opt-in bắt buộc và tường minh: không có optIn=true thì không nhận
	 * clip, chứ không mặc định đồng ý. Giới hạn lượt/tuần theo §6.2 (con số ở
	 * config, Q8 của đặc tả còn treo). Không kèm exerciseId = màn camera:
	 * analyzer tự nhận diện bài từ số đo (design-cham-form-llm-v1.md §4.4).
	 */
	@Transactional
	public ReviewResponse create(
			UUID userId, UUID exerciseId, boolean optIn, List<String> viewpoints, List<MultipartFile> files) {
		if (!optIn) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần đồng ý gửi clip lên để chấm (optIn)");
		}
		if (files == null || files.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần ít nhất một clip");
		}
		if (files.size() > MAX_CLIPS) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tối đa " + MAX_CLIPS + " clip mỗi lần gửi");
		}
		Exercise exercise = null;
		if (exerciseId != null) {
			exercise = exercises.findById(exerciseId)
					.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
			if (!exercise.isAnalyzable()) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài này chưa hỗ trợ chấm form");
			}
		}
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

	public List<ReviewResponse> list(UUID userId) {
		List<VideoReviewRequest> mine = requests.findByUserIdOrderByCreatedAtDesc(userId);
		Map<UUID, Exercise> byId = exercises.findAllById(
				mine.stream().map(VideoReviewRequest::getExerciseId).filter(Objects::nonNull).distinct().toList())
				.stream().collect(Collectors.toMap(Exercise::getId, e -> e));
		// HashMap của toMap trả null cho khoá null: yêu cầu chưa nhận diện bài thì không có tên bài.
		return mine.stream().map(r -> toResponse(r, byId.get(r.getExerciseId()))).toList();
	}

	public ReviewResponse get(UUID userId, UUID id) {
		VideoReviewRequest request = owned(userId, id);
		return toResponse(request, request.getExerciseId() == null ? null
				: exercises.findById(request.getExerciseId()).orElse(null));
	}

	/**
	 * "Sai bài?" và "chưa nhận ra bài" (design-cham-form-llm-v1.md §5.3): đổi bài rồi chấm lại
	 * từ bộ số đã lưu. Không tạo yêu cầu mới nên không tính thêm lượt.
	 */
	@Transactional
	public ReviewResponse changeExercise(UUID userId, UUID id, ChangeExerciseRequest body) {
		VideoReviewRequest request = owned(userId, id);
		Exercise exercise = exercises.findById(body.exerciseId())
				.filter(Exercise::isAnalyzable)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài này chưa hỗ trợ chấm form"));
		boolean finished = "DONE".equals(request.getStatus())
				|| ("REJECTED".equals(request.getStatus()) && "UNKNOWN_EXERCISE".equals(request.getRejectReason()));
		if (!finished || !request.hasFeatures() || exercise.getId().equals(request.getExerciseId())) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Lần chấm này không chấm lại được");
		}
		results.deleteByRequestId(id);
		request.changeExercise(exercise.getId());
		return toResponse(requests.save(request), exercise);
	}

	private VideoReviewRequest owned(UUID userId, UUID id) {
		return requests.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy yêu cầu chấm"));
	}

	private ReviewResponse toResponse(VideoReviewRequest request, Exercise exercise) {
		List<ReviewResult> rows = results.findByRequestId(request.getId());
		// Kết quả rule cũ lấy code qua form_checks; mục do LLM chấm có name_vi, không gắn form_check.
		Map<UUID, String> codeByFormCheck = request.getExerciseId() == null ? Map.of()
				: formChecks.findByExerciseId(request.getExerciseId()).stream()
						.collect(Collectors.toMap(FormCheck::getId, FormCheck::getCode));

		List<ReviewResponse.CheckResultResponse> checks = rows.stream()
				.map(r -> new ReviewResponse.CheckResultResponse(
						r.getId(), r.getFormCheckId() == null ? null : codeByFormCheck.get(r.getFormCheckId()),
						r.getNameVi(), r.getVerdict(), r.getConfidence(), r.getMeasured(), r.getCueTextVi(),
						r.isPrimary()))
				.sorted(CHECK_ORDER)
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
