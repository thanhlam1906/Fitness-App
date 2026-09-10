package com.fitness;

import com.fitness.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;

/**
 * Không assert gì thêm ngoài việc context load được: application.yml đặt
 * jpa.hibernate.ddl-auto=validate, nên Spring Boot tự fail khi entity JPA
 * lệch với schema Flyway đã migrate (V1__init.sql + R__seed_content.sql).
 */
class SchemaValidationTest extends PostgresIntegrationTest {

	@Test
	void entitiesMatchMigratedSchema() {
	}
}
