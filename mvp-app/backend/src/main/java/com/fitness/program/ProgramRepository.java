package com.fitness.program;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramRepository extends JpaRepository<Program, UUID> {

	Optional<Program> findByUserIdAndStatus(UUID userId, String status);

	/** Cột "Chương trình" ở màn 11 — lấy một lần cho cả bảng. */
	List<Program> findByStatus(String status);
}
