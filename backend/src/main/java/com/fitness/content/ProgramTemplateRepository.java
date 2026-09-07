package com.fitness.content;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramTemplateRepository extends JpaRepository<ProgramTemplate, UUID> {

	List<ProgramTemplate> findByActiveTrueAndSessionsMinLessThanEqualAndSessionsMaxGreaterThanEqual(
			short sessionsPerWeekAsMin, short sessionsPerWeekAsMax);
}
