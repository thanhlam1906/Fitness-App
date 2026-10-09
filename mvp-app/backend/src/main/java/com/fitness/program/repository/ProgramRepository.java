package com.fitness.program.repository;

import com.fitness.program.entity.Program;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProgramRepository extends JpaRepository<Program, UUID> {

	Optional<Program> findByUserIdAndStatus(UUID userId, String status);

	/** Cột "Chương trình" ở màn 11 — lấy một lần cho cả bảng. */
	List<Program> findByStatus(String status);

	/** Số người đang dùng một template — màn admin cảnh báo trước khi sửa quy tắc. */
	long countByTemplateIdAndStatus(UUID templateId, String status);

	/**
	 * Tổng quan admin: chỉ người tập đang mở khoá (role USER, active), cùng nghĩa "người đang tập" với trang
	 * Người dùng. Cột: templateId (null = lịch tự thiết kế), số người.
	 */
	@Query("select p.templateId, count(p) from Program p join User u on u.id = p.userId "
			+ "where p.status = 'ACTIVE' and u.active = true and u.role = com.fitness.auth.entity.Role.USER "
			+ "group by p.templateId")
	List<Object[]> activeUserCountsByTemplate();

	/** Cùng điều kiện với truy vấn trên. Cột: mục tiêu ("NONE" = chưa chọn hoặc chưa có hồ sơ), số người. */
	@Query("select coalesce(pr.goal, 'NONE'), count(p) from Program p join User u on u.id = p.userId "
			+ "left join Profile pr on pr.userId = p.userId "
			+ "where p.status = 'ACTIVE' and u.active = true and u.role = com.fitness.auth.entity.Role.USER "
			+ "group by coalesce(pr.goal, 'NONE')")
	List<Object[]> activeGoalCounts();
}
