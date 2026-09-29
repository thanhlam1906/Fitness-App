package com.fitness.program;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
