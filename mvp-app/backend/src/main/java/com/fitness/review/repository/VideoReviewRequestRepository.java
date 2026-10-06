package com.fitness.review.repository;

import com.fitness.review.entity.VideoReviewRequest;
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
}
