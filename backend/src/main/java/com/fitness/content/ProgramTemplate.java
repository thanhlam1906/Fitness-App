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
 * Bảng program_templates, V1__init.sql. week_structure/progression giữ raw
 * JSON text — service layer tự parse bằng ObjectMapper khi cần, entity không
 * biết về CycleDay/CycleExercise của package program.
 */
@Entity
@Table(name = "program_templates")
public class ProgramTemplate {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(nullable = false, unique = true)
	private String slug;

	@Column(nullable = false)
	private String name;

	@Column
	private String methodology;

	@Column(name = "sessions_min", nullable = false)
	private short sessionsMin;

	@Column(name = "sessions_max", nullable = false)
	private short sessionsMax;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "required_equipment", columnDefinition = "text[]", nullable = false)
	private String[] requiredEquipment = new String[0];

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "week_structure", columnDefinition = "jsonb", nullable = false)
	private String weekStructure;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", nullable = false)
	private String progression;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	protected ProgramTemplate() {
	}

	public UUID getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public String getName() {
		return name;
	}

	public String getMethodology() {
		return methodology;
	}

	public short getSessionsMin() {
		return sessionsMin;
	}

	public short getSessionsMax() {
		return sessionsMax;
	}

	public String[] getRequiredEquipment() {
		return requiredEquipment;
	}

	public String getWeekStructure() {
		return weekStructure;
	}

	public boolean isActive() {
		return active;
	}
}
