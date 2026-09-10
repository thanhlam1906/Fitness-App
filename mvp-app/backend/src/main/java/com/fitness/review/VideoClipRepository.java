package com.fitness.review;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VideoClipRepository extends JpaRepository<VideoClip, UUID> {

	List<VideoClip> findByRequestId(UUID requestId);

	@Query("select c from VideoClip c where c.deletedAt is null and c.uploadedAt < :before")
	List<VideoClip> findOrphans(Instant before);
}
