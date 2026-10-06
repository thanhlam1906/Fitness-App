package com.fitness.program.repository;

import com.fitness.program.entity.Program;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramRepository extends JpaRepository<Program, UUID> {

	Optional<Program> findByUserIdAndStatus(UUID userId, String status);

	/** Cột "Chương trình" ở màn 11 — lấy một lần cho cả bảng. */
	List<Program> findByStatus(String status);

	/** Số người đang dùng một template — màn admin cảnh báo trước khi sửa quy tắc. */
	long countByTemplateIdAndStatus(UUID templateId, String status);
}
