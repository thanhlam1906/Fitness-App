package com.fitness.feedback.repository;

import com.fitness.feedback.entity.CueFeedback;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CueFeedbackRepository extends JpaRepository<CueFeedback, UUID> {

	/** Badge "Góp ý bị báo sai" ở sidebar admin. */
	long countByWrongTrue();

	/**
	 * Tổng quan admin: góp ý bị báo sai từ `since` theo ngày (múi `zone`) và nguồn. Mọi người, khớp badge
	 * ở trên. Cột: ngày, nguồn (FORM, LOAD, ASSISTANT), số góp ý.
	 */
	@Query(value = """
			select cast(f.created_at at time zone :zone as date),
			       case when f.review_result_id is not null then 'FORM'
			            when f.load_decision_id is not null then 'LOAD'
			            else 'ASSISTANT' end,
			       count(*)
			from cue_feedback f
			where f.is_wrong and f.created_at >= :since
			group by 1, 2""", nativeQuery = true)
	List<Object[]> wrongByDayAndSourceSince(Instant since, String zone);
}
