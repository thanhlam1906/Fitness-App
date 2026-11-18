package com.fitness.program.service.progression;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PainAreasTest {

	private static final String[] SQUAT = {"QUADS", "GLUTES", "CORE"};
	private static final String[] BENCH = {"CHEST", "TRICEPS", "SHOULDERS"};

	@Test
	void khongBaoDau_khongBaiNaoBiAnhHuong() {
		assertThat(PainAreas.affects(List.of(), SQUAT)).isFalse();
	}

	@Test
	void dauGoi_chiAnhHuongBaiChan() {
		assertThat(PainAreas.affects(List.of("KNEE_L"), SQUAT)).isTrue();
		assertThat(PainAreas.affects(List.of("KNEE_L"), BENCH)).isFalse();
	}

	@Test
	void nhieuVung_motVungTrungLaDu() {
		assertThat(PainAreas.affects(List.of("WRIST", "SHOULDER_R"), BENCH)).isTrue();
	}

	@Test
	void vungKhongGhepDuocNhomCo_anhHuongMoiBai() {
		// Đầu, cổ, "Chỗ khác" không biết bài nào liên quan: giữ cách cũ, giảm cả buổi.
		assertThat(PainAreas.affects(List.of("HEAD"), BENCH)).isTrue();
		assertThat(PainAreas.affects(List.of("NECK"), SQUAT)).isTrue();
		assertThat(PainAreas.affects(List.of("OTHER"), SQUAT)).isTrue();
		assertThat(PainAreas.affects(List.of("MA_LA"), SQUAT)).isTrue();
	}

	@Test
	void baiKhongCoNhomCo_coiNhuLienQuan() {
		assertThat(PainAreas.affects(List.of("KNEE_R"), new String[0])).isTrue();
	}
}
