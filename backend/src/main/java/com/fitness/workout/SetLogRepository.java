package com.fitness.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {

	Optional<SetLog> findBySessionIdAndExerciseIdAndSetIndex(UUID sessionId, UUID exerciseId, short setIndex);

	List<SetLog> findBySessionId(UUID sessionId);
}
