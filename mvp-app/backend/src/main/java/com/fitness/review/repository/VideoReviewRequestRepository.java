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

	/**
	 * Tổng quan admin: lượt chấm xong theo bài từ `since`, chỉ người tập (admin chấm thử không tính).
	 * Cột: exerciseId, tên, số lượt, số người.
	 */
	@Query(value = """
			select e.id, coalesce(e.name_vi, e.name_en), count(*), count(distinct r.user_id)
			from video_review_requests r
			join exercises e on e.id = r.exercise_id
			join users u on u.id = r.user_id
			where r.status = 'DONE' and u.role = 'USER' and r.created_at >= :since
			group by e.id, e.name_vi, e.name_en""", nativeQuery = true)
	List<Object[]> doneCountsByExerciseSince(Instant since);
}
