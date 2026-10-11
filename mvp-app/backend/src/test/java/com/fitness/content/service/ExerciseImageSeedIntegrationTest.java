package com.fitness.content.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.support.PostgresIntegrationTest;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;

/** Migration V17 nạp ảnh bài seed vào exercise_images (doc/design-anh-bai-tap-v1.md §3). */
class ExerciseImageSeedIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void moiFileAnhTrongClasspath_coMotDongDungBytes() throws IOException {
		Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:exercise-images/*");
		assertThat(files).hasSize(36);
		for (Resource file : files) {
			String name = file.getFilename();
			String slug = name.substring(0, name.lastIndexOf('.'));
			String kind = name.endsWith(".gif") ? "ANIMATED" : "STILL";
			Map<String, Object> row = jdbc.queryForMap(
					"SELECT content_type, bytes FROM exercise_images WHERE slug = ? AND kind = ?", slug, kind);
			assertThat(row.get("content_type")).isEqualTo(kind.equals("ANIMATED") ? "image/gif" : "image/jpeg");
			try (InputStream in = file.getInputStream()) {
				assertThat((byte[]) row.get("bytes")).as(name).isEqualTo(in.readAllBytes());
			}
		}
	}

	@Test
	void baiChuaCoGif_khongCoDongAnhDong() {
		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM exercise_images WHERE slug = 'bodyweight-squat' AND kind = 'ANIMATED'", Long.class))
				.isZero();
	}
}
