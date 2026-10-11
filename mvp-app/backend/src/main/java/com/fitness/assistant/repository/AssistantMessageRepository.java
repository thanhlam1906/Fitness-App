package com.fitness.assistant.repository;

import com.fitness.assistant.entity.AssistantMessage;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, UUID> {

	/** Bộ nhớ hội thoại — N lượt gần nhất cùng thread, §6. */
	List<AssistantMessage> findByUserIdAndThreadIdOrderByCreatedAtAsc(UUID userId, UUID threadId);

	/**
	 * Tổng quan admin: số câu người tập gửi trợ lý từ `since`, theo ngày (múi `zone`) và người. Giữ cột
	 * người để đếm số người khác nhau trong cả tuần. Cột: ngày, userId, số câu.
	 * ponytail: số dòng = ngày × người hỏi và quét cả bảng (chưa có index created_at). Khi chậm: gom điểm
	 * ngay trong SQL và thêm index (created_at) WHERE role = 'USER'.
	 */
	@Query(value = """
			select cast(m.created_at at time zone :zone as date), m.user_id, count(*)
			from assistant_messages m
			join users u on u.id = m.user_id
			where m.role = 'USER' and u.role = 'USER' and m.created_at >= :since
			group by 1, 2""", nativeQuery = true)
	List<Object[]> questionsByDayAndUserSince(Instant since, String zone);
}
