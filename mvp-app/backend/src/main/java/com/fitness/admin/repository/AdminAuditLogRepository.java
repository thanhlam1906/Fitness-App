package com.fitness.admin.repository;

import com.fitness.admin.entity.AdminAuditLog;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, UUID> {

	Page<AdminAuditLog> findByTargetIdOrderByCreatedAtDescIdDesc(UUID targetId, Pageable pageable);

	Page<AdminAuditLog> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
}
