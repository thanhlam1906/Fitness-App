package com.fitness.content.repository;

import com.fitness.content.entity.ProgramTemplate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgramTemplateRepository extends JpaRepository<ProgramTemplate, UUID> {

	List<ProgramTemplate> findByActiveTrue();

	Optional<ProgramTemplate> findBySlug(String slug);
}
