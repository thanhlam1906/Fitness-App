package com.fitness.content.controller;

import com.fitness.content.dto.ExerciseImageResponse;
import com.fitness.content.service.ExerciseImageService;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MultipartFile;

/** Ảnh minh hoạ bài tập (doc/design-anh-bai-tap-v1.md §4). Xem công khai, đặt/xoá chỉ admin. */
@RestController
public class ExerciseImageController {

	private final ExerciseImageService images;

	public ExerciseImageController(ExerciseImageService images) {
		this.images = images;
	}

	// Công khai (SecurityConfig): thẻ <img> của web và Image của mobile không gửi được token.
	@GetMapping("/api/v1/exercise-images/{slug}/{kind}")
	public ResponseEntity<byte[]> get(@PathVariable String slug, @PathVariable String kind, WebRequest request) {
		ExerciseImageResponse image = images.get(slug, kind);
		if (request.checkNotModified(image.etag())) {
			return null; // Spring đã đặt 304
		}
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(image.contentType()))
				// no-cache = vẫn giữ bản lưu nhưng hỏi lại mỗi lần: admin đổi ảnh thì lần mở sau người tập thấy ngay.
				.cacheControl(CacheControl.noCache())
				.eTag(image.etag())
				.body(image.bytes());
	}

	@PostMapping(path = "/api/v1/exercises/{id}/images/{kind}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('ADMIN')")
	public void save(@PathVariable UUID id, @PathVariable String kind, @RequestParam("file") MultipartFile file) {
		images.save(id, kind, file);
	}

	@DeleteMapping("/api/v1/exercises/{id}/images/{kind}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasRole('ADMIN')")
	public void delete(@PathVariable UUID id, @PathVariable String kind) {
		images.delete(id, kind);
	}
}
