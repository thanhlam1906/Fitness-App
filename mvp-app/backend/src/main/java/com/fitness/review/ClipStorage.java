package com.fitness.review;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * concept-backend-v1.md §8: "Một class ClipStorage, đường dẫn gốc lấy từ
 * config. Dev: thư mục local mà analyzer mount chung. Deploy: đổi sang MinIO
 * hoặc S3, sửa đúng một class."
 */
@Component
public class ClipStorage {

	private final Path root;

	public ClipStorage(@Value("${app.clip-storage-path}") String clipStoragePath) {
		this.root = Path.of(clipStoragePath);
	}

	/** Key dạng clips/2026/09/<uuid>.mp4 — phân theo tháng để thư mục không phình thành một mớ phẳng. */
	public String store(MultipartFile file) {
		LocalDate today = LocalDate.now();
		String key = "clips/%d/%02d/%s%s".formatted(
				today.getYear(), today.getMonthValue(), UUID.randomUUID(), extensionOf(file.getOriginalFilename()));
		Path target = resolve(key);
		try {
			Files.createDirectories(target.getParent());
			file.transferTo(target);
		} catch (IOException e) {
			throw new UncheckedIOException("Không ghi được clip " + key, e);
		}
		return key;
	}

	/** N2: xoá file ngay sau khi chấm xong. Idempotent — gọi lại trên file đã xoá không lỗi. */
	public void delete(String storageKey) {
		try {
			Files.deleteIfExists(resolve(storageKey));
		} catch (IOException e) {
			throw new UncheckedIOException("Không xoá được clip " + storageKey, e);
		}
	}

	/** Chặn path traversal: key do code sinh, nhưng cũng đọc lại từ DB nên vẫn kiểm. */
	private Path resolve(String storageKey) {
		Path resolved = root.resolve(storageKey).normalize();
		if (!resolved.startsWith(root.normalize())) {
			throw new IllegalArgumentException("storage key không hợp lệ: " + storageKey);
		}
		return resolved;
	}

	private String extensionOf(String originalFilename) {
		if (originalFilename == null) {
			return ".mp4";
		}
		int dot = originalFilename.lastIndexOf('.');
		if (dot < 0 || dot == originalFilename.length() - 1) {
			return ".mp4";
		}
		String ext = originalFilename.substring(dot).toLowerCase();
		return ext.matches("\\.[a-z0-9]{2,5}") ? ext : ".mp4";
	}
}
