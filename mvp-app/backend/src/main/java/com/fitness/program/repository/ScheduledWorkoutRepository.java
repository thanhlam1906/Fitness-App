package com.fitness.program.repository;

import com.fitness.program.entity.ScheduledWorkout;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ScheduledWorkoutRepository extends JpaRepository<ScheduledWorkout, UUID> {

	List<ScheduledWorkout> findByProgramIdOrderByScheduledOn(UUID programId);

	/**
	 * Trang "Buổi tập" của admin: buổi lỡ có ngày trong [from, today). Lỡ = status MISSED, hoặc PLANNED mà
	 * đã qua ngày — đúng quy tắc ScheduledWorkout.displayStatus, vì DB không tự đổi PLANNED sang MISSED.
	 * Chỉ chương trình đang chạy (ACTIVE), như màn Lịch và cột tuân thủ của admin: đổi chương trình chỉ lưu
	 * trữ cái cũ mà không đụng các buổi PLANNED của nó, tính vào thì thành buổi lỡ ma.
	 * Một cột: templateId của chương trình (null = lịch tự thiết kế).
	 */
	@Query("select p.templateId from ScheduledWorkout sw join Program p on p.id = sw.programId "
			+ "where p.status = 'ACTIVE' and sw.scheduledOn >= :from and sw.scheduledOn < :today "
			+ "and sw.status in ('MISSED', 'PLANNED')")
	List<UUID> missedTemplateIdsBetween(LocalDate from, LocalDate today);
}
