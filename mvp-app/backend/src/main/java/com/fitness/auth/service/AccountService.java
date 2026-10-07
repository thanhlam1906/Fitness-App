package com.fitness.auth.service;

import com.fitness.auth.entity.Role;
import com.fitness.auth.entity.User;
import com.fitness.auth.repository.UserRepository;
import com.fitness.profile.service.ProfileService;
import java.security.SecureRandom;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thao tác quản trị lên bảng users (doc/design-quan-ly-user-v1.md §5). Nằm ở auth vì auth sở hữu
 * bảng; luật "ai được làm gì" (không tự thao tác, bắt lý do, nhật ký) ở AdminUserService.
 */
@Service
public class AccountService {

	/** Bỏ 0 O 1 l I: admin đọc mật khẩu tạm cho người dùng qua điện thoại hay tin nhắn. */
	private static final String TEMP_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
	private static final int TEMP_LENGTH = 12;

	public record CreatedAccount(User user, String temporaryPassword) {
	}

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final AuthService authService;
	private final ProfileService profileService;
	private final SecureRandom random = new SecureRandom();

	public AccountService(
			UserRepository users, PasswordEncoder passwordEncoder, AuthService authService,
			ProfileService profileService) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.authService = authService;
		this.profileService = profileService;
	}

	@Transactional
	public User setActive(UUID id, boolean active) {
		User user = find(id);
		user.setActive(active);
		if (!active) {
			authService.revokeSessions(user);
		}
		return users.saveAndFlush(user);
	}

	/** Thu hồi phiên để người đó đăng nhập lại và giao diện nhận đúng vai trò mới. */
	@Transactional
	public User changeRole(UUID id, Role role) {
		User user = find(id);
		user.setRole(role);
		authService.revokeSessions(user);
		return user;
	}

	@Transactional
	public String resetPassword(UUID id) {
		User user = find(id);
		String temporary = temporaryPassword();
		user.setPassword(passwordEncoder.encode(temporary), true);
		authService.revokeSessions(user);
		return temporary;
	}

	@Transactional
	public CreatedAccount create(String email, String fullName, String phone, Role role) {
		if (users.existsByEmail(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký");
		}
		String temporary = temporaryPassword();
		User user = new User(email, passwordEncoder.encode(temporary), role);
		user.setPassword(user.getPasswordHash(), true);
		user = users.saveAndFlush(user);
		profileService.createForNewUser(user.getId(), fullName, phone);
		// Flush cả persistence context (gồm profile vừa tạo): AdminUserService đọc lại dòng bằng
		// query JDBC trong cùng transaction, chưa flush thì họ tên trả về null.
		users.flush();
		return new CreatedAccount(user, temporary);
	}

	/** Dữ liệu tập, hồ sơ, token… đi theo ON DELETE CASCADE của DB. */
	@Transactional
	public void delete(UUID id) {
		User user = find(id);
		users.clearInviteCodeUsage(id);
		users.delete(user);
		users.flush();
	}

	private User find(UUID id) {
		return users.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
	}

	private String temporaryPassword() {
		StringBuilder s = new StringBuilder(TEMP_LENGTH);
		for (int i = 0; i < TEMP_LENGTH; i++) {
			s.append(TEMP_ALPHABET.charAt(random.nextInt(TEMP_ALPHABET.length())));
		}
		return s.toString();
	}
}
