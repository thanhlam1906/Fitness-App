package com.fitness.content.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** Loại ảnh theo byte đầu file, không tin đuôi file (doc/design-anh-bai-tap-v1.md §4). */
class ExerciseImageServiceTest {

	private static byte[] ascii(String s) {
		return s.getBytes(StandardCharsets.ISO_8859_1);
	}

	@Test
	void nhanDungBonLoai() {
		assertThat(ExerciseImageService.detectType(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isEqualTo("image/jpeg");
		assertThat(ExerciseImageService.detectType(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})).isEqualTo("image/png");
		assertThat(ExerciseImageService.detectType(ascii("GIF89a..."))).isEqualTo("image/gif");
		assertThat(ExerciseImageService.detectType(ascii("GIF87a..."))).isEqualTo("image/gif");
		assertThat(ExerciseImageService.detectType(ascii("RIFF\0\0\0\0WEBPVP8 "))).isEqualTo("image/webp");
	}

	@Test
	void chuThuongDoiDuoi_hoacQuaNgan_khongNhan() {
		assertThat(ExerciseImageService.detectType(ascii("hello world"))).isNull();
		assertThat(ExerciseImageService.detectType(ascii("RIFF\0\0\0\0WAVE"))).isNull();
		assertThat(ExerciseImageService.detectType(new byte[] {(byte) 0xFF})).isNull();
		assertThat(ExerciseImageService.detectType(new byte[0])).isNull();
	}
}
