package com.fitness.workout;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** concept-backend-v1.md §5 Lớp 1: entity thuộc user không có findById, chỉ findByIdAndUserId. */
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

	Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);
}
