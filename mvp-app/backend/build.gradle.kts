plugins {
	java
	id("org.springframework.boot") version "3.5.16"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.fitness"
version = "0.0.1-SNAPSHOT"

java {
	// concept-backend-v1.md §2.1 chốt Java 21 LTS. Máy dev có thể chạy JDK mới hơn
	// (--release cross-compile bên dưới) — không cần cài riêng JDK 21 hay tải toolchain.
	sourceCompatibility = JavaVersion.VERSION_21
}

tasks.withType<JavaCompile> {
	options.release.set(21)
}

repositories {
	mavenCentral()
}

dependencies {
	// web + validation
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-validation")

	// dữ liệu — concept-backend-v1.md §2.1
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.flywaydb:flyway-core")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")

	// auth — chỉ verify JWT có sẵn của Spring, phần CẤP token tự viết sau (chưa có ở đợt này)
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")

	// health check để xác nhận DB nối được — dùng ngay ở đợt nền tảng này
	implementation("org.springframework.boot:spring-boot-starter-actuator")

	// API docs
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.5")

	// test — concept-backend-v1.md §10: Testcontainers Postgres, không H2
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	// TestRestTemplate mac dinh dung HttpURLConnection, khong gui duoc PATCH
	// (/me/profile). httpclient5 co mat la Spring Boot tu doi sang factory ho tro PATCH.
	testImplementation("org.apache.httpcomponents.client5:httpclient5")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.4"))
	testImplementation("org.testcontainers:junit-jupiter")
	testImplementation("org.testcontainers:postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
