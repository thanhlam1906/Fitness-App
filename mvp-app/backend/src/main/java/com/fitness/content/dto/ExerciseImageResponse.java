package com.fitness.content.dto;

import java.time.Instant;

/**
 * Ảnh trả cho trình duyệt. Dòng có bytes: trả thẳng, ETag theo lần đổi cuối (ảnh không đổi thì nhận 304, không tải lại).
 * Dòng có url (ảnh ở Cloudinary): bytes null, controller trả 302 tới url.
 */
public record ExerciseImageResponse(String contentType, byte[] bytes, String url, Instant updatedAt) {

	public String etag() {
		return "\"" + updatedAt.toEpochMilli() + "\"";
	}
}
