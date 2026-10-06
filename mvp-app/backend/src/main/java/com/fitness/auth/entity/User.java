package com.fitness.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;

/**
 * Bảng users, concept-backend-v1.md §4 / V1__init.sql, V15__user_management.sql.
 */
@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue
	private UUID id;

	@JdbcType(CitextJdbcType.class)
	@Column(nullable = false, unique = true)
	private String email;

	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private Role role;

	@Column(name = "is_active", nullable = false)
	private boolean active;

	/** Token cấp trước mốc này bị từ chối (doc/design-quan-ly-user-v1.md §4.1). Cắt tới giây như JWT iat. */
	@Column(name = "tokens_valid_after", nullable = false)
	private Instant tokensValidAfter;

	/** Admin vừa đặt mật khẩu tạm: đăng nhập không cấp token cho tới khi đổi mật khẩu. */
	@Column(name = "must_change_password", nullable = false)
	private boolean mustChangePassword;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected User() {
	}

	public User(String email, String passwordHash, Role role) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.role = role;
		this.active = true;
		this.createdAt = Instant.now();
		this.tokensValidAfter = createdAt.truncatedTo(ChronoUnit.SECONDS);
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public Role getRole() {
		return role;
	}

	public boolean isActive() {
		return active;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getTokensValidAfter() {
		return tokensValidAfter;
	}

	public boolean isMustChangePassword() {
		return mustChangePassword;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public void setRole(Role role) {
		this.role = role;
	}

	public void setPassword(String passwordHash, boolean mustChangePassword) {
		this.passwordHash = passwordHash;
		this.mustChangePassword = mustChangePassword;
	}

	/**
	 * Mọi access token đang lưu hành mất hiệu lực ở request kế tiếp. Mốc là giây KẾ TIẾP vì iat chỉ
	 * có độ phân giải giây: mốc bằng giây hiện tại thì token cũ phát trong giây này vẫn lọt qua.
	 */
	public void invalidateTokens() {
		this.tokensValidAfter = Instant.now().truncatedTo(ChronoUnit.SECONDS).plusSeconds(1);
	}
}
