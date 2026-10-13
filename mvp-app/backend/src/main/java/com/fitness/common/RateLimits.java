package com.fitness.common;

import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Rate limit theo khoá (doc/design-chiu-loi-v1.md §5): mỗi email + IP, IP hay người dùng một bộ đếm riêng,
 * cấu hình mẫu theo `name` ở resilience4j.ratelimiter.configs. Một tiến trình backend: bộ đếm nằm trong RAM.
 */
@Component
public class RateLimits {

	private static final Map<String, String> MESSAGES = Map.of(
			"login", "Bạn thử quá nhiều lần, chờ 1 phút rồi thử lại.",
			"register", "Mạng này đăng ký quá nhiều lần, thử lại sau.",
			"assistant", "Bạn hỏi nhanh quá, chờ một chút rồi hỏi tiếp.");

	private final RateLimiterRegistry registry;

	public RateLimits(RateLimiterRegistry registry) {
		this.registry = registry;
	}

	public void check(String name, String key) {
		if (!registry.rateLimiter(name + ":" + key, name).acquirePermission()) {
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, MESSAGES.get(name));
		}
	}

	/**
	 * Mỗi email lạ là một bộ đếm mới: không xoá thì kẻ gửi hàng triệu email bịa làm phình RAM. Giá phải trả:
	 * đúng lúc xoá, kẻ dò được thêm tối đa một lượt đầy.
	 */
	@Scheduled(fixedDelayString = "PT1H")
	public void clearAll() {
		registry.getAllRateLimiters().forEach(limiter -> registry.remove(limiter.getName()));
	}
}
