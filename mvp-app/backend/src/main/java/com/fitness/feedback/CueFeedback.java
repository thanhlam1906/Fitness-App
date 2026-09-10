package com.fitness.feedback;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng cue_feedback, V1__init.sql — nút "góp ý này sai". Dùng chung cho CẢ
 * kết quả chấm form (C6) LẪN quyết định tải: đặc tả yêu cầu nút này ở mọi góp
 * ý do máy sinh ra, nên một bảng thay vì hai. DB ép đúng một trong hai id
 * khác null (CHECK num_nonnulls = 1).
 */
@Entity
@Table(name = "cue_feedback")
public class CueFeedback {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "review_result_id")
	private UUID reviewResultId;

	@Column(name = "load_decision_id")
	private UUID loadDecisionId;

	@Column(name = "is_wrong", nullable = false)
	private boolean wrong;

	@Column
	private String note;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected CueFeedback() {
	}

	public CueFeedback(UUID userId, UUID reviewResultId, UUID loadDecisionId, boolean wrong, String note) {
		this.userId = userId;
		this.reviewResultId = reviewResultId;
		this.loadDecisionId = loadDecisionId;
		this.wrong = wrong;
		this.note = note;
	}

	public UUID getId() {
		return id;
	}
}
