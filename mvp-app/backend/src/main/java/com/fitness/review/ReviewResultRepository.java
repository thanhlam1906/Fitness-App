package com.fitness.review;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewResultRepository extends JpaRepository<ReviewResult, UUID> {

	List<ReviewResult> findByRequestId(UUID requestId);
}
