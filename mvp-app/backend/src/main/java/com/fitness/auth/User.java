package com.fitness.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;

/**
 * Bảng users, concept-backend-v1.md §4 / V1__init.sql. Auth (đăng ký, cấp
 * JWT) chưa xây ở đợt này — user được tạo thẳng qua repository (vd test,
 * script) cho tới khi có endpoint đăng ký.
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
}
