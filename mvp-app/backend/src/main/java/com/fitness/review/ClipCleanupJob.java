package com.fitness.review;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * concept-backend-v1.md §8 — job dọn dẹp hàng đợi và clip:
 * PROCESSING quá 15 phút = analyzer chết giữa chừng → trả về PENDING;
 * attempts >= 3 → FAILED, người dùng thấy "chấm không thành công, gửi lại";
 * clip chưa xoá quá 24h = mồ côi → xoá file và đánh dấu.
 *
 * Xoá ngay sau khi chấm xong vẫn là đường chính (analyzer làm). Job này là
 * lưới an toàn, không phải cơ chế chính.
 */
@Component
public class ClipCleanupJob {

	private static final Logger log = LoggerFactory.getLogger(ClipCleanupJob.class);
	private static final Duration STUCK_AFTER = Duration.ofMinutes(15);
	private static final Duration ORPHAN_AFTER = Duration.ofHours(24);
	private static final short MAX_ATTEMPTS = 3;

	private final VideoReviewRequestRepository requests;
	private final VideoClipRepository clips;
	private final ClipStorage clipStorage;

	public ClipCleanupJob(
			VideoReviewRequestRepository requests, VideoClipRepository clips, ClipStorage clipStorage) {
		this.requests = requests;
		this.clips = clips;
		this.clipStorage = clipStorage;
	}

	@Scheduled(fixedDelayString = "PT5M")
	@Transactional
	public void requeueStuckRequests() {
		List<VideoReviewRequest> stuck = requests.findStuck(Instant.now().minus(STUCK_AFTER));
		for (VideoReviewRequest request : stuck) {
			if (request.getAttempts() >= MAX_ATTEMPTS) {
				request.fail("Chấm không thành công sau " + MAX_ATTEMPTS + " lần thử");
			} else {
				request.requeue();
			}
			requests.save(request);
		}
		if (!stuck.isEmpty()) {
			log.info("Dọn hàng đợi chấm form: {} yêu cầu treo", stuck.size());
		}
	}

	@Scheduled(fixedDelayString = "PT1H")
	@Transactional
	public void deleteOrphanClips() {
		List<VideoClip> orphans = clips.findOrphans(Instant.now().minus(ORPHAN_AFTER));
		for (VideoClip clip : orphans) {
			clipStorage.delete(clip.getStorageKey());
			clip.markDeleted();
			clips.save(clip);
		}
		if (!orphans.isEmpty()) {
			log.warn("Xoá {} clip mồ côi quá 24h — analyzer lẽ ra phải xoá ngay sau khi chấm", orphans.size());
		}
	}
}
