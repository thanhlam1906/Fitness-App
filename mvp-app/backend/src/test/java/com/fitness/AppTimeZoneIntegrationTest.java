package com.fitness;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.support.PostgresIntegrationTest;
import java.time.ZoneId;
import java.util.TimeZone;
import org.junit.jupiter.api.Test;

/**
 * "Hôm nay" của backend (LocalDate.now() ở lịch, cân nặng, chương trình) phải theo giờ Việt Nam
 * như web. Container chạy UTC nên từ 0h tới 7h sáng hai bên lệch một ngày.
 */
class AppTimeZoneIntegrationTest extends PostgresIntegrationTest {

	@Test
	void appRunsOnVietnamTime() {
		assertThat(TimeZone.getDefault().getID()).isEqualTo("Asia/Ho_Chi_Minh");
		assertThat(ZoneId.systemDefault()).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
	}
}
