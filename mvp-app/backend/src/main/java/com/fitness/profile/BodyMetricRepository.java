package com.fitness.profile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BodyMetricRepository extends JpaRepository<BodyMetric, UUID> {

	Optional<BodyMetric> findByUserIdAndMeasuredOn(UUID userId, LocalDate measuredOn);

	List<BodyMetric> findByUserIdOrderByMeasuredOnDesc(UUID userId);
}
