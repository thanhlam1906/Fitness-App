package com.fitness.review;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VideoReviewRequestRepository extends JpaRepository<VideoReviewRequest, UUID> {

	Optional<VideoReviewRequest> findByIdAndUserId(UUID id, UUID userId);

	List<VideoReviewRequest> findByUserIdOrderByCreatedAtDesc(UUID userId);

	long countByUserIdAndCreatedAtAfter(UUID userId, Instant since);

	@Query("select r from VideoReviewRequest r where r.status = 'PROCESSING' and r.startedAt < :before")
	List<VideoReviewRequest> findStuck(Instant before);

	/** Cột "Clip" ở màn 11. */
	@Query("select r.userId, count(r) from VideoReviewRequest r group by r.userId")
	List<Object[]> requestCountPerUser();

	/** Badge "Hàng đợi phân tích" ở sidebar admin. */
	long countByStatusIn(List<String> statuses);

	long countByUserId(UUID userId);
}
