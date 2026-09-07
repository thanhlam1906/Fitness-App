package com.fitness.support;

import com.fitness.auth.JwtIssuer;
import com.fitness.auth.Role;
import com.fitness.auth.User;
import com.fitness.auth.UserRepository;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base cho integration test cần Postgres thật (build.gradle.kts: "Testcontainers
 * Postgres, không H2"). Singleton container: KHÔNG dùng @Testcontainers/@Container
 * — annotation đó gắn lifecycle stop() vào @AfterAll của TỪNG test class, nên
 * nhiều test class kế thừa cùng field static sẽ stop container sau class đầu
 * tiên rồi class sau connect vào container đã chết. Start 1 lần ở static
 * initializer, không stop — Ryuk (Testcontainers) dọn khi JVM thoát.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class PostgresIntegrationTest {

	static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

	static {
		POSTGRES.start();
	}

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private JwtIssuer jwtIssuer;

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
	}

	/**
	 * Tạo user thật (role tuỳ chọn) và JWT hợp lệ cho user đó — dùng thẳng
	 * JwtIssuer thay vì gọi /auth/login qua HTTP, vì phần lớn test không cần
	 * test lại cơ chế đăng nhập, chỉ cần "một user đã đăng nhập". AuthController
	 * có test riêng cho chính luồng register/login/refresh.
	 */
	protected UUID createUserAndAuthorize(Role role, HttpHeaders headers) {
		UUID userId = userRepository.save(
				new User("test+" + UUID.randomUUID() + "@example.com", "unused", role)).getId();
		headers.setBearerAuth(jwtIssuer.issueAccessToken(userId, role));
		return userId;
	}

	protected <T> HttpEntity<T> authed(T body, Role role) {
		HttpHeaders headers = new HttpHeaders();
		createUserAndAuthorize(role, headers);
		return new HttpEntity<>(body, headers);
	}

	protected record AuthedUser(UUID userId, HttpHeaders headers) {
	}

	protected AuthedUser newAuthedUser(Role role) {
		HttpHeaders headers = new HttpHeaders();
		UUID userId = createUserAndAuthorize(role, headers);
		return new AuthedUser(userId, headers);
	}
}
