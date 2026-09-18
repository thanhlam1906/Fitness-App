package com.fitness.assistant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Bảng assistant_messages, V7__assistant_messages.sql — log hội thoại + nguồn cho eval (§6, §11). */
@Entity
@Table(name = "assistant_messages")
public class AssistantMessage {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "thread_id", nullable = false)
	private UUID threadId;

	@Column(nullable = false)
	private String role;

	@Column(nullable = false)
	private String content;

	@Column
	private String intent;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "chunk_ids", columnDefinition = "uuid[]")
	private UUID[] chunkIds = new UUID[0];

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "tools_called", columnDefinition = "text[]")
	private String[] toolsCalled = new String[0];

	@Column(name = "guard_result")
	private String guardResult;

	@Column(name = "is_wrong")
	private Boolean isWrong;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected AssistantMessage() {
	}

	public AssistantMessage(UUID userId, UUID threadId, String role, String content) {
		this.userId = userId;
		this.threadId = threadId;
		this.role = role;
		this.content = content;
	}

	public void tagAssistantMetadata(String intent, UUID[] chunkIds, String[] toolsCalled, String guardResult) {
		this.intent = intent;
		this.chunkIds = chunkIds == null ? new UUID[0] : chunkIds;
		this.toolsCalled = toolsCalled == null ? new String[0] : toolsCalled;
		this.guardResult = guardResult;
	}

	public UUID getId() {
		return id;
	}

	public UUID getThreadId() {
		return threadId;
	}

	public String getRole() {
		return role;
	}

	public String getContent() {
		return content;
	}

	public String getIntent() {
		return intent;
	}

	public String getGuardResult() {
		return guardResult;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
