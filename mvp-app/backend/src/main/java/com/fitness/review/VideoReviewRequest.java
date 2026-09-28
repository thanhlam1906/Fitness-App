package com.fitness.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

	// null = màn camera, analyzer chưa nhận diện bài (V11).
	@Column(name = "exercise_id")
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

	// Bộ số từng rep do analyzer ghi (chỉ số, không hình). Backend chỉ đọc để biết có chấm lại được không.
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", insertable = false, updatable = false)
	private String features;

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

	public boolean hasFeatures() {
		return features != null;
	}

	/**
	 * "Sai bài?" (design-cham-form-llm-v1.md §5.3): đặt bài người dùng chọn rồi đưa về hàng đợi.
	 * Worker thấy request đã có features thì chấm lại từ đó, không cần clip.
	 */
	public void changeExercise(UUID exerciseId) {
		this.exerciseId = exerciseId;
		this.status = "PENDING";
		this.rejectReason = null;
		this.error = null;
		this.attempts = 0;
		this.startedAt = null;
		this.finishedAt = null;
	}
}
