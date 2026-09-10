package com.fitness.workout;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** concept-backend-v1.md §5 Lớp 1: entity thuộc user không có findById, chỉ findByIdAndUserId. */
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

	Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

	Optional<WorkoutSession> findByUserIdAndScheduledWorkoutIdAndStatus(
			UUID userId, UUID scheduledWorkoutId, String status);

	/** "Hoạt động gần nhất" ở màn admin Người dùng (màn 11). Một query gộp, không N+1. */
	@Query("select s.userId, max(s.startedAt) from WorkoutSession s group by s.userId")
	List<Object[]> lastActivityPerUser();

	@Query("select max(s.startedAt) from WorkoutSession s where s.userId = :userId")
	Optional<Instant> lastActivityForUser(UUID userId);

	/** Cột "Buổi" ở màn 11. Một query gộp, không N+1. */
	@Query("select s.userId, count(s) from WorkoutSession s group by s.userId")
	List<Object[]> sessionCountPerUser();

	long countByStartedAtAfter(Instant since);

	long countByUserId(UUID userId);
}
