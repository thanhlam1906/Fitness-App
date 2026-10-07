package com.fitness.program.repository;

import com.fitness.program.entity.LoadDecision;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LoadDecisionRepository extends JpaRepository<LoadDecision, UUID> {

	List<LoadDecision> findByProgramIdAndExerciseId(UUID programId, UUID exerciseId);

	List<LoadDecision> findByProgramId(UUID programId);

	/** Nút "cái này sai" (FeedbackController): chỉ góp ý được vào quyết định tải của chính mình. */
	boolean existsByIdAndUserId(UUID id, UUID userId);

	/**
	 * §5 Lớp 1: theo userId, không theo programId — assistant.tools.ExplainLoadChangeTool
	 * hỏi "vì sao tải bài X đổi" không cần biết programId, và không được đọc
	 * quyết định của user khác dù có exerciseId trùng.
	 */
	Optional<LoadDecision> findFirstByUserIdAndExerciseIdOrderByEffectiveFromDesc(UUID userId, UUID exerciseId);

	/**
	 * Trang "Buổi tập" của admin. Cột: templateId (null = lịch tự thiết kế), exerciseId, direction, ruleId.
	 * Loại SUBSTITUTE (PainRule ghi khi đau lặp lại): trang chỉ có Tăng/Giữ/Giảm, còn đau lặp lại đã hiện
	 * ở khối đau; để lại thì một nhóm chỉ có SUBSTITUTE thành dòng toàn số 0.
	 */
	@Query("select p.templateId, d.exerciseId, d.direction, d.ruleId "
			+ "from LoadDecision d join Program p on p.id = d.programId "
			+ "where d.createdAt >= :from and d.direction <> 'SUBSTITUTE'")
	List<Object[]> insightRowsSince(Instant from);
}
