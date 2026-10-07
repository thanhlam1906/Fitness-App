package com.fitness.program.service.progression;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ProgressionConfigTest {

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void templateCuThieuKhoaNguong_docRaSoMacDinh() throws Exception {
		// Đúng dạng seed: có "mode" (bỏ qua) và chỉ vài khoá.
		ProgressionConfig c = ProgressionConfig.from(mapper.readTree(
				"{\"mode\":\"LINEAR\",\"target_rpe\":8,\"increment_kg\":{\"barbell-back-squat\":2.5},\"deload_pct\":10}"));

		assertThat(c.minCompletionPct()).isEqualTo(70);
		assertThat(c.rpeLowStreak()).isEqualTo(2);
		assertThat(c.rpeOver()).isEqualTo(1);
		assertThat(c.missedSetsToDeload()).isEqualTo(2);
		assertThat(c.failStreakToDeload()).isEqualTo(2);
		assertThat(c.incrementFor("barbell-back-squat")).isEqualByComparingTo("2.5");
	}

	@Test
	void incrementNull_laKhongTuTang_vanGiuKhoa() throws Exception {
		ProgressionConfig c = ProgressionConfig.from(mapper.readTree("{\"increment_kg\":{\"kb-swing\":null}}"));

		assertThat(c.incrementKg()).containsKey("kb-swing");
		assertThat(c.incrementFor("kb-swing")).isNull();
	}

	@Test
	void toJsonRoiFrom_raDungConfig() {
		var inc = new java.util.LinkedHashMap<String, BigDecimal>();
		inc.put("barbell-back-squat", new BigDecimal("2.5"));
		inc.put("kb-swing", null);
		ProgressionConfig c = new ProgressionConfig(7, 3, 0.5, 60, 3, 1, 15, inc);

		ProgressionConfig back = ProgressionConfig.from(c.toJson(mapper));

		assertThat(back).usingRecursiveComparison().withComparatorForType(BigDecimal::compareTo, BigDecimal.class).isEqualTo(c);
		assertThat(c.toJson(mapper).has("mode")).isFalse();
	}
}
