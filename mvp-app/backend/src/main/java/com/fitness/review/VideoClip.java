package com.fitness.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng video_clips, V1__init.sql. N2 của đặc tả §3: file bị xoá NGAY sau khi
 * chấm xong và deleted_at được set. ClipCleanupJob chỉ là lưới an toàn cho
 * clip mồ côi quá 24h, không phải cơ chế chính.
 */
@Entity
@Table(name = "video_clips")
public class VideoClip {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "request_id", nullable = false)
	private UUID requestId;

	@Column(name = "storage_key", nullable = false)
	private String storageKey;

	@Column
	private String viewpoint;

	@Column(name = "duration_ms")
	private Integer durationMs;

	@Column(name = "size_bytes")
	private Long sizeBytes;

	@Column(name = "uploaded_at", nullable = false, updatable = false)
	private Instant uploadedAt = Instant.now();

	@Column(name = "deleted_at")
	private Instant deletedAt;

	protected VideoClip() {
	}

	public VideoClip(UUID requestId, String storageKey, String viewpoint, Long sizeBytes) {
		this.requestId = requestId;
		this.storageKey = storageKey;
		this.viewpoint = viewpoint;
		this.sizeBytes = sizeBytes;
	}

	public UUID getId() {
		return id;
	}

	public UUID getRequestId() {
		return requestId;
	}

	public String getStorageKey() {
		return storageKey;
	}

	public String getViewpoint() {
		return viewpoint;
	}

	public Instant getUploadedAt() {
		return uploadedAt;
	}

	public void markDeleted() {
		this.deletedAt = Instant.now();
	}
}
