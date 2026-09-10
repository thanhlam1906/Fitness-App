package com.fitness.workout;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PainReportRepository extends JpaRepository<PainReport, UUID> {

	List<PainReport> findBySessionId(UUID sessionId);
}
