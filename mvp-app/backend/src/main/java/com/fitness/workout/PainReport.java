package com.fitness.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Bảng pain_reports, V1__init.sql — báo đau cuối buổi, ưu tiên cao nhất khi điều chỉnh tải. */
@Entity
@Table(name = "pain_reports")
public class PainReport {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "session_id", nullable = false)
	private UUID sessionId;

	@Column(name = "body_area", nullable = false)
	private String bodyArea;

	@Column(nullable = false)
	private short severity;

	@Column
	private String note;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected PainReport() {
	}

	public PainReport(UUID sessionId, String bodyArea, short severity, String note) {
		this.sessionId = sessionId;
		this.bodyArea = bodyArea;
		this.severity = severity;
		this.note = note;
	}

	public UUID getId() {
		return id;
	}

	public UUID getSessionId() {
		return sessionId;
	}

	public String getBodyArea() {
		return bodyArea;
	}

	public short getSeverity() {
		return severity;
	}
}
