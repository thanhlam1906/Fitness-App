package com.fitness.workout.service;

import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.SetLogRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.OptionalDouble;
import java.util.UUID;
import java.util.stream.IntStream;
import org.springframework.stereotype.Service;

/**
 * Tiến bộ N tuần gần nhất — một chỗ tính cho cả trợ lý (AssistantTools.getProgressSummary) và màn
 * Cài đặt › Tiến bộ, để hai nơi luôn ra cùng số. Mọi số đọc từ DB, không ước lượng.
 */
@Service
public class ProgressService {

	/** from là Instant, không LocalDate: web tự đổi sang ngày theo giờ máy người dùng. */
	public record Week(Instant from, BigDecimal tonnageKg) {
	}

	public record Progress(
			int weeks, long sessionsStarted, long sessionsFinished, BigDecimal totalTonnageKg, Double avgSessionRpe,
			List<Week> weekly) {
	}

	private final WorkoutSessionRepository sessions;
	private final SetLogRepository setLogs;

	public ProgressService(WorkoutSessionRepository sessions, SetLogRepository setLogs) {
		this.sessions = sessions;
		this.setLogs = setLogs;
	}

	public Progress summary(UUID userId, int weeks) {
		int w = Math.max(1, Math.min(weeks, 52));
		Instant now = Instant.now();
		Instant since = now.minus(Duration.ofDays(w * 7L));

		List<WorkoutSession> started = sessions.findByUserIdAndStartedAtAfter(userId, since);
		long finished = started.stream().filter(s -> "DONE".equals(s.getStatus())).count();
		OptionalDouble avgRpe = started.stream()
				.map(WorkoutSession::getSessionRpe)
				.filter(java.util.Objects::nonNull)
				.mapToInt(Short::intValue)
				.average();

		// Tuần cuộn 7 ngày tính ngược từ bây giờ, tuần cuối kết thúc đúng `now` — tổng lấy bằng
		// cộng các cột để cột và tổng không bao giờ lệch nhau.
		// ponytail: một query mỗi tuần (tối đa 52), gộp thành một GROUP BY nếu thấy chậm.
		List<Week> weekly = IntStream.range(0, w)
				.mapToObj(i -> {
					Instant from = since.plus(Duration.ofDays(7L * i));
					Instant to = i == w - 1 ? now : from.plus(Duration.ofDays(7));
					return new Week(from, setLogs.tonnageBetween(userId, from, to));
				})
				.toList();
		BigDecimal total = weekly.stream().map(Week::tonnageKg).reduce(BigDecimal.ZERO, BigDecimal::add);

		return new Progress(w, started.size(), finished, total, avgRpe.isPresent() ? avgRpe.getAsDouble() : null,
				weekly);
	}
}
