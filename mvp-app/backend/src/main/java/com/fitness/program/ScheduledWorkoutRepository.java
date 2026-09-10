package com.fitness.program;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ScheduledWorkoutRepository extends JpaRepository<ScheduledWorkout, UUID> {

	List<ScheduledWorkout> findByProgramIdOrderByScheduledOn(UUID programId);

	/**
	 * Cột "Tuần" và "Tuân thủ lịch" ở màn 11, gộp một query cho mọi user:
	 * userId, tổng buổi, số buổi xong, tổng số tuần, tuần đang tới.
	 */
	@Query("select p.userId, count(sw), "
			+ "sum(case when sw.status = 'DONE' then 1 else 0 end), "
			+ "max(sw.weekIndex), "
			+ "min(case when sw.status = 'PLANNED' then sw.weekIndex else null end) "
			+ "from ScheduledWorkout sw join Program p on p.id = sw.programId "
			+ "where p.status = 'ACTIVE' group by p.userId")
	List<Object[]> scheduleStatsPerUser();
}
