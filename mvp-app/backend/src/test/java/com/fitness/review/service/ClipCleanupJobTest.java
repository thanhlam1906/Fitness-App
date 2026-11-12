package com.fitness.review.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitness.review.entity.VideoClip;
import com.fitness.review.repository.VideoClipRepository;
import com.fitness.review.repository.VideoReviewRequestRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ClipCleanupJobTest {

	private final VideoClipRepository clips = mock(VideoClipRepository.class);
	private final ClipStorage clipStorage = mock(ClipStorage.class);
	private final ClipCleanupJob job = new ClipCleanupJob(mock(VideoReviewRequestRepository.class), clips, clipStorage);

	@Test
	void deleteOrphanClips_oneFileStuck_stillDeletesTheRest() {
		// Analyzer không đánh dấu clip xoá hỏng, nên job này sẽ gặp file kẹt (sai quyền, ổ chỉ đọc). Một file kẹt
		// mà làm cả lượt ném lỗi thì giao dịch lùi lại, mọi clip đứng sau nó nằm mãi trên đĩa.
		VideoClip stuck = new VideoClip(UUID.randomUUID(), "clips/ket.mp4", "SAGITTAL", 1L);
		VideoClip fine = new VideoClip(UUID.randomUUID(), "clips/binh-thuong.mp4", "FRONTAL", 1L);
		when(clips.findOrphans(any())).thenReturn(List.of(stuck, fine));
		doThrow(new UncheckedIOException("giả sai quyền", new IOException())).when(clipStorage).delete("clips/ket.mp4");

		job.deleteOrphanClips();

		verify(clipStorage).delete("clips/binh-thuong.mp4");
		verify(clips).save(fine);
		// File kẹt để nguyên chưa đánh dấu: lượt sau còn thử lại.
		verify(clips, never()).save(stuck);
	}
}
