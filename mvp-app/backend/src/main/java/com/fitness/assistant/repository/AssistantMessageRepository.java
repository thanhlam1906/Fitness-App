package com.fitness.assistant.repository;

import com.fitness.assistant.entity.AssistantMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, UUID> {

	/** Bộ nhớ hội thoại — N lượt gần nhất cùng thread, §6. */
	List<AssistantMessage> findByUserIdAndThreadIdOrderByCreatedAtAsc(UUID userId, UUID threadId);
}
