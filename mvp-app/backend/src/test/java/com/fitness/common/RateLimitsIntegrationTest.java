package com.fitness.common;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.support.PostgresIntegrationTest;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class RateLimitsIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private RateLimits rateLimits;

	@Autowired
	private MeterRegistry meterRegistry;

	// Mỗi khoá là một bộ đếm: metrics của rate limiter thêm gauge gắn tên khoá (có cả email) cho từng bộ đếm.
	@Test
	void checkKhongDangKyMetricTheoKhoa() {
		rateLimits.check("login", "a@x.com|1.1.1.1");

		assertThat(meterRegistry.getMeters())
				.noneMatch(m -> m.getId().getName().startsWith("resilience4j.ratelimiter"));
	}
}
