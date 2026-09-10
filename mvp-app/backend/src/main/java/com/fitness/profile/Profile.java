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
 *
 * Onboarding lưu TỪNG BƯỚC (§4 ke-hoach-chi-tiet-chuc-nang-v1.md: "bỏ dở
 * được rồi quay lại tiếp"), nên mọi trường sửa lẻ được — patch() bỏ qua đối
 * số null thay vì ghi đè bằng null.
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

	public Short getBirthYear() {
		return birthYear;
	}

	public String getGender() {
		return gender;
	}

	public Instant getDisclaimerAt() {
		return disclaimerAt;
	}

	public String getOnboardingStep() {
		return onboardingStep;
	}

	/** null = không đổi trường đó. Disclaimer chỉ ghi dấu thời gian một lần, không xoá được. */
	public void patch(
			String goal, String experience, Short sessionsPerWeek, String[] equipment,
			Short birthYear, String gender, Boolean acceptDisclaimer, String onboardingStep) {
		if (goal != null) {
			this.goal = goal;
		}
		if (experience != null) {
			this.experience = experience;
		}
		if (sessionsPerWeek != null) {
			this.sessionsPerWeek = sessionsPerWeek;
		}
		if (equipment != null) {
			this.equipment = equipment;
		}
		if (birthYear != null) {
			this.birthYear = birthYear;
		}
		if (gender != null) {
			this.gender = gender;
		}
		if (Boolean.TRUE.equals(acceptDisclaimer) && this.disclaimerAt == null) {
			this.disclaimerAt = Instant.now();
		}
		if (onboardingStep != null) {
			this.onboardingStep = onboardingStep;
		}
		this.updatedAt = Instant.now();
	}
}
