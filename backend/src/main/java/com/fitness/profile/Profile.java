package com.fitness.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Bảng profiles, PK = user_id (V1__init.sql). goal/experience/gender giữ
 * kiểu String thay vì enum Java: CHECK constraint ở DB đã ép giá trị hợp lệ,
 * thêm enum + converter ở tầng Java chỉ là trùng việc.
 */
@Entity
@Table(name = "profiles")
public class Profile {

	@Id
	@Column(name = "user_id")
	private UUID userId;

	@Column
	private String goal;

	@Column
	private String experience;

	@Column(name = "sessions_per_week")
	private Short sessionsPerWeek;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(columnDefinition = "text[]", nullable = false)
	private String[] equipment = new String[0];

	@Column(name = "birth_year")
	private Short birthYear;

	@Column
	private String gender;

	@Column(name = "disclaimer_at")
	private Instant disclaimerAt;

	@Column(name = "onboarding_step", nullable = false)
	private String onboardingStep = "DISCLAIMER";

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	protected Profile() {
	}

	public Profile(UUID userId) {
		this.userId = userId;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getGoal() {
		return goal;
	}

	public String getExperience() {
		return experience;
	}

	public Short getSessionsPerWeek() {
		return sessionsPerWeek;
	}

	public String[] getEquipment() {
		return equipment;
	}

	public void applyOnboarding(String goal, String experience, Short sessionsPerWeek, String[] equipment) {
		this.goal = goal;
		this.experience = experience;
		this.sessionsPerWeek = sessionsPerWeek;
		this.equipment = equipment;
		this.updatedAt = Instant.now();
	}
}
