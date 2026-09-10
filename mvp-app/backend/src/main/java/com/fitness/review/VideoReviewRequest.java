package com.fitness.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng video_review_requests, V1__init.sql — một yêu cầu chấm form (1–3 clip
 * cùng một bài). Trạng thái do analyzer đổi (PENDING → PROCESSING → DONE /
 * FAILED / REJECTED); backend chỉ tạo dòng PENDING rồi đọc kết quả.
 */
@Entity
@Table(name = "video_review_requests")
public class VideoReviewRequest {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(nullable = false)
	private String status = "PENDING";

	@Column(name = "reject_reason")
	private String rejectReason;

	@Column
	private String error;

	@Column(nullable = false)
	private short attempts;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	@Column(name = "started_at")
	private Instant startedAt;

	@Column(name = "finished_at")
	private Instant finishedAt;

	protected VideoReviewRequest() {
	}

	public VideoReviewRequest(UUID userId, UUID exerciseId) {
		this.userId = userId;
		this.exerciseId = exerciseId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public String getStatus() {
		return status;
	}

	public String getRejectReason() {
		return rejectReason;
	}

	public String getError() {
		return error;
	}

	public short getAttempts() {
		return attempts;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getFinishedAt() {
		return finishedAt;
	}

	/** Job dọn hàng đợi: analyzer chết giữa chừng thì trả về PENDING hoặc bỏ cuộc. */
	public void requeue() {
		this.status = "PENDING";
		this.startedAt = null;
	}

	public void fail(String error) {
		this.status = "FAILED";
		this.error = error;
		this.finishedAt = Instant.now();
	}
}
