package com.fitness.workout.repository;

import com.fitness.workout.entity.WorkoutSession;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** concept-backend-v1.md §5 Lớp 1: entity thuộc user không có findById, chỉ findByIdAndUserId. */
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

	Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

	Optional<WorkoutSession> findByUserIdAndScheduledWorkoutIdAndStatus(
			UUID userId, UUID scheduledWorkoutId, String status);

	/** Màn Lịch (M3): buổi mới nhất của một ngày, để xem lại buổi đã tập hoặc tiếp tục buổi dở. */
	Optional<WorkoutSession> findFirstByUserIdAndScheduledWorkoutIdOrderByStartedAtDesc(
			UUID userId, UUID scheduledWorkoutId);

	Optional<WorkoutSession> findFirstByUserIdAndScheduledWorkoutIdAndStatusOrderByStartedAtDesc(
			UUID userId, UUID scheduledWorkoutId, String status);

	/** exists chứ không find: dữ liệu cũ có thể có hai buổi DONE cùng ngày, Optional sẽ văng 500. */
	boolean existsByUserIdAndScheduledWorkoutIdAndStatus(UUID userId, UUID scheduledWorkoutId, String status);

	List<WorkoutSession> findByUserIdAndStatus(UUID userId, String status);

	/** ProgressSummaryTool §9 nhóm B3 — tiến bộ N tuần qua, theo userId. */
	List<WorkoutSession> findByUserIdAndStartedAtAfter(UUID userId, Instant since);
}
