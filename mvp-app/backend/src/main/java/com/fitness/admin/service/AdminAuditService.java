package com.fitness.admin.service;

import com.fitness.admin.dto.AdminAuditLogResponse;
import com.fitness.admin.dto.AdminPageResponse;
import com.fitness.admin.entity.AdminAuditLog;
import com.fitness.admin.repository.AdminAuditLogRepository;
import com.fitness.auth.entity.User;
import com.fitness.auth.repository.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Nhật ký quản trị (doc/design-quan-ly-user-v1.md §5.5, §6.7). Lưu email thẳng vào dòng để còn đọc được sau khi xoá. */
@Service
public class AdminAuditService {

	private final AdminAuditLogRepository logs;
	private final UserRepository users;

	public AdminAuditService(AdminAuditLogRepository logs, UserRepository users) {
		this.logs = logs;
		this.users = users;
	}

	/**
	 * saveAndFlush: dòng nhật ký phải vào DB TRƯỚC khi xoá user, để ON DELETE SET NULL gỡ target_id
	 * thay vì insert sau tham chiếu một user đã mất (vi phạm FK).
	 */
	@Transactional
	public void record(UUID actorId, User target, String action, Map<String, Object> detail, String reason) {
		String actorEmail = users.findById(actorId).map(User::getEmail).orElse("(không rõ)");
		logs.saveAndFlush(new AdminAuditLog(actorId, actorEmail, target.getId(), target.getEmail(), action, detail, reason));
	}

	public AdminPageResponse<AdminAuditLogResponse> list(UUID targetId, int page, int size) {
		if (page < 0 || size < 1 || size > 100) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trang không hợp lệ");
		}
		PageRequest pageable = PageRequest.of(page, size);
		Page<AdminAuditLog> result = targetId == null
				? logs.findAllByOrderByCreatedAtDescIdDesc(pageable)
				: logs.findByTargetIdOrderByCreatedAtDescIdDesc(targetId, pageable);
		return new AdminPageResponse<>(result.map(AdminAuditLogResponse::from).getContent(),
				result.getTotalElements(), page, size);
	}
}
