package com.fitness.content.dto;

import java.time.Instant;

/** Ảnh trả thẳng cho trình duyệt. ETag theo lần đổi cuối: ảnh không đổi thì trình duyệt nhận 304, không tải lại. */
public record ExerciseImageResponse(String contentType, byte[] bytes, Instant updatedAt) {

	public String etag() {
		return "\"" + updatedAt.toEpochMilli() + "\"";
	}
}
