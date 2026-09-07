package com.fitness.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng refresh_tokens, V3__refresh_tokens.sql. Lưu HASH, không lưu token
 * thật (rò DB không lộ token dùng được). Rotation: mỗi lần refresh cấp token
 * mới và revoke token cũ — dùng lại token đã revoke là dấu hiệu bị đánh cắp.
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "token_hash", nullable = false, unique = true)
	private String tokenHash;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected RefreshToken() {
	}

	public RefreshToken(UUID userId, String tokenHash, Instant expiresAt) {
		this.userId = userId;
		this.tokenHash = tokenHash;
		this.expiresAt = expiresAt;
	}

	public boolean isUsable() {
		return revokedAt == null && expiresAt.isAfter(Instant.now());
	}

	public void revoke() {
		this.revokedAt = Instant.now();
	}

	public UUID getUserId() {
		return userId;
	}
}
