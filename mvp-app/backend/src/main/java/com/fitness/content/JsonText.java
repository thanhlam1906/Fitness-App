package com.fitness.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Các cột jsonb (thresholds, week_structure, progression) được editor admin
 * gửi lên dạng JSON thô (F4 concept-frontend-v1.md — textarea, chưa dựng
 * form riêng). Validate cú pháp trước khi ghi DB, tránh giá trị jsonb hỏng.
 */
final class JsonText {

	private JsonText() {
	}

	/** Cột jsonb nullable (filming_guide): bỏ trống là hợp lệ, có giá trị thì phải đúng cú pháp. */
	static void requireValidOrNull(ObjectMapper objectMapper, String fieldName, String json) {
		if (json == null || json.isBlank()) {
			return;
		}
		requireValid(objectMapper, fieldName, json);
	}

	static void requireValid(ObjectMapper objectMapper, String fieldName, String json) {
		try {
			objectMapper.readTree(json);
		} catch (Exception e) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, fieldName + " không phải JSON hợp lệ: " + e.getMessage());
		}
	}
}
