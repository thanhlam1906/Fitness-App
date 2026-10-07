package com.fitness.auth.repository;

import com.fitness.auth.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/** invite_codes.used_by không có ON DELETE CASCADE (V1) — gỡ trước khi xoá tài khoản. */
	@Modifying
	@Query(value = "update invite_codes set used_by = null where used_by = :userId", nativeQuery = true)
	int clearInviteCodeUsage(UUID userId);
}
