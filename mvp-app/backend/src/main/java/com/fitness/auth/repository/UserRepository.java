package com.fitness.auth.repository;

import com.fitness.auth.entity.User;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

	/**
	 * Tham số bind dạng varchar nên `email = ?` so phân biệt hoa thường dù cột là citext. Đăng nhập Google/Facebook
	 * phải khớp "Lam@gmail.com" đã đăng ký với "lam@gmail.com" Google trả về, không thì tạo trùng và vướng unique.
	 */
	@Query(value = "select * from users where email = cast(:email as citext)", nativeQuery = true)
	Optional<User> findByEmailIgnoreCase(String email);

	/** Khoá dòng tới hết transaction: hai request cùng sửa một tài khoản không ghi đè nhau. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select u from User u where u.id = :id")
	Optional<User> lockById(UUID id);

	/** invite_codes.used_by không có ON DELETE CASCADE (V1) — gỡ trước khi xoá tài khoản. */
	@Modifying
	@Query(value = "update invite_codes set used_by = null where used_by = :userId", nativeQuery = true)
	int clearInviteCodeUsage(UUID userId);
}
