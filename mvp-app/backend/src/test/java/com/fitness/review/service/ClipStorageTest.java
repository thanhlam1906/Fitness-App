package com.fitness.review.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class ClipStorageTest {

	@TempDir
	Path root;

	@Test
	void store_failsMidWrite_leavesNoPartialFile() throws IOException {
		// Đĩa đầy giữa chừng: transferTo đã ghi được một phần rồi mới ném lỗi. Không có dòng video_clips nào
		// trỏ tới phần đã ghi, nên ClipCleanupJob không bao giờ thấy nó.
		MockMultipartFile halfWritten = new MockMultipartFile("clips", "a.mp4", "video/mp4", new byte[10]) {
			@Override
			public void transferTo(Path dest) throws IOException {
				Files.write(dest, new byte[5]);
				throw new IOException("giả đĩa đầy");
			}
		};

		assertThatThrownBy(() -> new ClipStorage(root.toString()).store(halfWritten))
				.isInstanceOf(UncheckedIOException.class);
		try (Stream<Path> files = Files.walk(root)) {
			assertThat(files.filter(Files::isRegularFile)).isEmpty();
		}
	}
}
