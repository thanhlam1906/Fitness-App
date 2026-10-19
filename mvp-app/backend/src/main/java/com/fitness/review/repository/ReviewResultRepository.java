package com.fitness.review.repository;

import com.fitness.review.entity.ReviewResult;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReviewResultRepository extends JpaRepository<ReviewResult, UUID> {

	List<ReviewResult> findByRequestIdIn(Collection<UUID> requestIds);

	/** Nút "cái này sai" (FeedbackController): kết quả phải thuộc yêu cầu chấm của chính người gọi. */
	@Query("select count(r) > 0 from ReviewResult r join VideoReviewRequest q on q.id = r.requestId "
			+ "where r.id = :id and q.userId = :userId")
	boolean existsOwnedBy(UUID id, UUID userId);
}
