package com.fitness.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class RateLimitsTest {

	private final RateLimits rateLimits = new RateLimits(RateLimiterRegistry.of(Map.of("login",
			RateLimiterConfig.custom().limitForPeriod(5).limitRefreshPeriod(Duration.ofMinutes(1))
					.timeoutDuration(Duration.ZERO).build())));

	@Test
	void lanThu6TrongCuaSo_bi429_khoaKhacKhongAnhHuong() {
		for (int i = 0; i < 5; i++) {
			rateLimits.check("login", "a@x.com|1.1.1.1");
		}

		assertThatThrownBy(() -> rateLimits.check("login", "a@x.com|1.1.1.1"))
				.isInstanceOfSatisfying(ResponseStatusException.class, e -> {
					assertThat(e.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
					assertThat(e.getReason()).isEqualTo("Bạn thử quá nhiều lần, chờ 1 phút rồi thử lại.");
				});
		assertThatCode(() -> rateLimits.check("login", "b@x.com|1.1.1.1")).doesNotThrowAnyException();
	}

	@Test
	void clearAll_demLaiTuDau() {
		for (int i = 0; i < 5; i++) {
			rateLimits.check("login", "a@x.com|1.1.1.1");
		}

		rateLimits.clearAll();

		assertThatCode(() -> rateLimits.check("login", "a@x.com|1.1.1.1")).doesNotThrowAnyException();
	}
}
