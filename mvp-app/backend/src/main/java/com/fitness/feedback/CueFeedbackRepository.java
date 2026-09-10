package com.fitness.feedback;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CueFeedbackRepository extends JpaRepository<CueFeedback, UUID> {

	/** Badge "Góp ý bị báo sai" ở sidebar admin. */
	long countByWrongTrue();
}
