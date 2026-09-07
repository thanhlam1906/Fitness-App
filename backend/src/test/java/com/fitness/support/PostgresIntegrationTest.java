package com.fitness.support;

import org.springframework.boot.test.context.SpringBootTest;
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

	@DynamicPropertySource
	static void datasourceProperties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
	}
}
