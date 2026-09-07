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

/**
 * Bảng exercises, V1__init.sql. filming_guide giữ raw JSON text — chưa có
 * trong editor admin (F2 concept-frontend-v1.md: cần ảnh minh hoạ, không
 * code được ở đợt này).
 */
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

	public Exercise(
			String slug, String nameEn, String nameVi, String[] muscleGroups,
			String[] equipment, String description, boolean analyzable) {
		this.slug = slug;
		this.nameEn = nameEn;
		this.nameVi = nameVi;
		this.muscleGroups = muscleGroups;
		this.equipment = equipment;
		this.description = description;
		this.analyzable = analyzable;
	}

	public void update(
			String nameEn, String nameVi, String[] muscleGroups,
			String[] equipment, String description, boolean analyzable, boolean active) {
		this.nameEn = nameEn;
		this.nameVi = nameVi;
		this.muscleGroups = muscleGroups;
		this.equipment = equipment;
		this.description = description;
		this.analyzable = analyzable;
		this.active = active;
		this.updatedAt = Instant.now();
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

	public String getNameVi() {
		return nameVi;
	}

	public String[] getMuscleGroups() {
		return muscleGroups;
	}

	public String[] getEquipment() {
		return equipment;
	}

	public String getDescription() {
		return description;
	}

	public boolean isAnalyzable() {
		return analyzable;
	}

	public boolean isActive() {
		return active;
	}
}
