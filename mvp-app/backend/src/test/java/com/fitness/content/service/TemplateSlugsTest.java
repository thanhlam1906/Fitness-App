package com.fitness.content.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TemplateSlugsTest {

	@Test
	void boDauTiengViet_chuThuong_gachNoi() {
		assertThat(TemplateSlugs.fromName("Full Body 3 buổi")).isEqualTo("full-body-3-buoi");
		assertThat(TemplateSlugs.fromName("  Đẩy / Kéo  ")).isEqualTo("day-keo");
		assertThat(TemplateSlugs.fromName("Upper / Lower (bản sao)")).isEqualTo("upper-lower-ban-sao");
	}

	@Test
	void tenKhongConChuNao_vanCoSlug() {
		assertThat(TemplateSlugs.fromName("!!!")).isEqualTo("template");
	}
}
