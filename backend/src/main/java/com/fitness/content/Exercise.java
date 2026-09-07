package com.fitness.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Bảng exercises, V1__init.sql. filming_guide giữ raw JSON text — chưa cần đọc ở slice này. */
@Entity
@Table(name = "exercises")
public class Exercise {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, unique = true)
	private String slug;

	@Column(name = "name_en", nullable = false)
	private String nameEn;

	@Column(name = "name_vi")
	private String nameVi;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "muscle_groups", columnDefinition = "text[]", nullable = false)
	private String[] muscleGroups = new String[0];

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]", nullable = false)
	private String[] equipment = new String[0];

	@Column
	private String description;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "filming_guide", columnDefinition = "jsonb")
	private String filmingGuide;

	@Column(nullable = false)
	private boolean analyzable;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	protected Exercise() {
	}

	public UUID getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public String getNameEn() {
		return nameEn;
	}
}
