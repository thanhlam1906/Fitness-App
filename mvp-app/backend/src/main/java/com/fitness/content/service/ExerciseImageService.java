package com.fitness.content.service;

import com.fitness.content.dto.ExerciseImageResponse;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Ảnh minh hoạ bài tập (doc/design-anh-bai-tap-v1.md §3–4): mỗi bài một ảnh tĩnh, một ảnh động tuỳ chọn.
 * Cất trong Postgres để bản sao lưu DB giữ luôn ảnh. Khoá theo slug — xem V16 vì sao không khoá ngoại.
 */
@Service
public class ExerciseImageService {

	static final long MAX_BYTES = 5L * 1024 * 1024;

	/** Đường dẫn API dùng `still`/`animated`, cột DB dùng tên enum. */
	private enum Kind {
		STILL(Set.of("image/jpeg", "image/png", "image/webp"), "Ảnh tĩnh chỉ nhận JPG, PNG hoặc WebP."),
		ANIMATED(Set.of("image/gif", "image/webp"), "Ảnh động chỉ nhận GIF hoặc WebP.");

		private final Set<String> accepted;
		private final String rejected;

		Kind(Set<String> accepted, String rejected) {
			this.accepted = accepted;
			this.rejected = rejected;
		}

		static Kind of(String path) {
			return switch (path) {
				case "still" -> STILL;
				case "animated" -> ANIMATED;
				default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không có loại ảnh này.");
			};
		}
	}

	private final JdbcTemplate jdbc;
	private final ExerciseRepository exercises;

	public ExerciseImageService(JdbcTemplate jdbc, ExerciseRepository exercises) {
		this.jdbc = jdbc;
		this.exercises = exercises;
	}

	public ExerciseImageResponse get(String slug, String kind) {
		return jdbc.query("SELECT content_type, bytes, updated_at FROM exercise_images WHERE slug = ? AND kind = ?",
						(rs, i) -> new ExerciseImageResponse(rs.getString(1), rs.getBytes(2), rs.getTimestamp(3).toInstant()),
						slug, Kind.of(kind).name())
				.stream().findFirst()
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài này chưa có ảnh."));
	}

	@Transactional
	public void save(UUID exerciseId, String kind, MultipartFile file) {
		Kind k = Kind.of(kind);
		Exercise exercise = findOrThrow(exerciseId);
		if (file.isEmpty()) {
			throw badRequest("File rỗng.");
		}
		// Kiểm cỡ trước khi đọc vào bộ nhớ: giới hạn multipart chung là 60 MB (cho clip).
		if (file.getSize() > MAX_BYTES) {
			throw badRequest("Ảnh lớn hơn 5 MB.");
		}
		byte[] bytes = readBytes(file);
		String type = detectType(bytes);
		if (type == null || !k.accepted.contains(type)) {
			throw badRequest(k.rejected);
		}
		jdbc.update("""
				INSERT INTO exercise_images (slug, kind, content_type, bytes) VALUES (?, ?, ?, ?)
				ON CONFLICT (slug, kind) DO UPDATE
				SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes, updated_at = now()
				""", exercise.getSlug(), k.name(), type, bytes);
		touch(exercise);
	}

	@Transactional
	public void delete(UUID exerciseId, String kind) {
		Kind k = Kind.of(kind);
		Exercise exercise = findOrThrow(exerciseId);
		jdbc.update("DELETE FROM exercise_images WHERE slug = ? AND kind = ?", exercise.getSlug(), k.name());
		touch(exercise);
	}

	/** slug → các loại ảnh đang có ("STILL", "ANIMATED"). Không đọc cột bytes: danh sách bài gọi mỗi lần mở. */
	public Map<String, Set<String>> kindsBySlug() {
		Map<String, Set<String>> kinds = new HashMap<>();
		jdbc.query("SELECT slug, kind FROM exercise_images",
				rs -> {
					kinds.computeIfAbsent(rs.getString(1), s -> new HashSet<>()).add(rs.getString(2));
				});
		return kinds;
	}

	/** Loại ảnh theo byte đầu file; null nếu không phải loại nào nhận. Đuôi file và Content-Type do client gửi nên không tin. */
	static String detectType(byte[] b) {
		if (startsWith(b, 0, 0xFF, 0xD8, 0xFF)) {
			return "image/jpeg";
		}
		if (startsWith(b, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
			return "image/png";
		}
		if (startsWith(b, 0, 'G', 'I', 'F', '8', '7', 'a') || startsWith(b, 0, 'G', 'I', 'F', '8', '9', 'a')) {
			return "image/gif";
		}
		if (startsWith(b, 0, 'R', 'I', 'F', 'F') && startsWith(b, 8, 'W', 'E', 'B', 'P')) {
			return "image/webp";
		}
		return null;
	}

	private static boolean startsWith(byte[] b, int offset, int... magic) {
		if (b.length < offset + magic.length) {
			return false;
		}
		for (int i = 0; i < magic.length; i++) {
			if ((b[offset + i] & 0xFF) != magic[i]) {
				return false;
			}
		}
		return true;
	}

	/** Đổi ảnh cũng là sửa bài: dòng "sửa lúc" và `?v=` xem trước của admin dựa vào mốc này. */
	private void touch(Exercise exercise) {
		exercise.touch();
		exercises.save(exercise);
	}

	private Exercise findOrThrow(UUID id) {
		return exercises.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
	}

	private static byte[] readBytes(MultipartFile file) {
		try {
			return file.getBytes();
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	private static ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
