package com.fitness.workout.service;

import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.program.service.ProgressionApplicationService;
import com.fitness.program.service.ScheduleService;
import com.fitness.workout.dto.FinishSessionRequest;
import com.fitness.workout.dto.SessionResponse;
import com.fitness.workout.dto.SetLogRequest;
import com.fitness.workout.dto.SetLogResponse;
import com.fitness.workout.dto.StartSessionRequest;
import com.fitness.workout.entity.PainReport;
import com.fitness.workout.entity.SetLog;
import com.fitness.workout.entity.WorkoutSession;
import com.fitness.workout.repository.PainReportRepository;
import com.fitness.workout.repository.SetLogRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Màn 5–6 concept-frontend-v1.md — buổi tập, log set, kết buổi. */
@Service
public class WorkoutSessionService {

	/** created = vừa tạo buổi mới; false = trả lại buổi đang dở. Controller đổi thành 201/200. */
	public record Started(SessionResponse session, boolean created) {
	}

	private final WorkoutSessionRepository sessions;
	private final SetLogRepository setLogs;
	private final PainReportRepository painReports;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ProgramRepository programs;
	private final ScheduleService scheduleService;
	private final ProgressionApplicationService progressionApplicationService;

	public WorkoutSessionService(
			WorkoutSessionRepository sessions, SetLogRepository setLogs, PainReportRepository painReports,
			ScheduledWorkoutRepository scheduledWorkouts, ProgramRepository programs, ScheduleService scheduleService,
			ProgressionApplicationService progressionApplicationService) {
		this.sessions = sessions;
		this.setLogs = setLogs;
		this.painReports = painReports;
		this.scheduledWorkouts = scheduledWorkouts;
		this.programs = programs;
		this.scheduleService = scheduleService;
		this.progressionApplicationService = progressionApplicationService;
	}

	/**
	 * Idempotent theo scheduledWorkoutId: buổi đang dở của cùng lịch thì trả lại
	 * chính nó kèm các set đã log, không tạo session thứ hai. Đây là cơ chế resume ở
	 * §5.1 concept-frontend-v1.md — khoá màn hình giữa buổi rồi mở lại, kể cả trên
	 * máy khác, vẫn đúng chỗ dở.
	 */
	public Started start(UUID userId, StartSessionRequest request) {
		if (request.scheduledWorkoutId() != null) {
			// Lớp 1 concept-backend-v1.md §5: buổi phải thuộc chương trình của người gọi. Thiếu
			// kiểm này thì B tạo được buổi trên lịch của A, kết buổi làm lịch A thành DONE và
			// engine tăng tải chạy theo. 404 chứ không 403: không xác nhận buổi đó tồn tại.
			boolean own = scheduledWorkouts.findById(request.scheduledWorkoutId())
					.flatMap(w -> programs.findById(w.getProgramId()))
					.map(p -> p.getUserId().equals(userId))
					.orElse(false);
			if (!own) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi tập");
			}
			var existing = sessions.findByUserIdAndScheduledWorkoutIdAndStatus(
					userId, request.scheduledWorkoutId(), "IN_PROGRESS");
			if (existing.isPresent()) {
				return new Started(withSets(existing.get()), false);
			}
			// Ngày đã tập xong: mở lại thì trước đây sinh thêm một buổi IN_PROGRESS cho cùng ngày.
			// Chỉ tra buổi của chính người gọi, nên không lộ trạng thái lịch của người khác.
			if (sessions.existsByUserIdAndScheduledWorkoutIdAndStatus(
					userId, request.scheduledWorkoutId(), "DONE")) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Buổi này đã tập xong");
			}
		}
		WorkoutSession session = new WorkoutSession(userId, request.scheduledWorkoutId());
		sessions.save(session);
		return new Started(withSets(session), true);
	}

	public SessionResponse get(UUID userId, UUID id) {
		return withSets(findOwnSessionOrThrow(userId, id));
	}

	/**
	 * Màn Lịch (M3): xem lại buổi đã tập của một ngày. Ngày của người khác cũng chỉ ra 404.
	 * Ưu tiên buổi DONE: lỗi cũ (mở lại ngày đã tập sinh buổi mới) để lại buổi IN_PROGRESS
	 * rỗng mới hơn, lấy "mới nhất" thì che mất buổi tập thật.
	 */
	public SessionResponse getByScheduledWorkout(UUID userId, UUID scheduledWorkoutId) {
		return sessions.findFirstByUserIdAndScheduledWorkoutIdAndStatusOrderByStartedAtDesc(userId, scheduledWorkoutId, "DONE")
				.or(() -> sessions.findFirstByUserIdAndScheduledWorkoutIdOrderByStartedAtDesc(userId, scheduledWorkoutId))
				.map(this::withSets)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có buổi tập cho ngày này"));
	}

	public SetLogResponse logSet(UUID userId, UUID sessionId, SetLogRequest request) {
		findOwnSessionOrThrow(userId, sessionId);
		SetLog setLog = setLogs.findBySessionIdAndExerciseIdAndSetIndex(sessionId, request.exerciseId(), request.setIndex())
				.orElseGet(() -> new SetLog(sessionId, request.exerciseId(), request.setIndex()));
		setLog.apply(
				request.targetReps(), request.reps(), request.loadKg(), request.rpe(),
				request.skipped(), request.skipReason());
		setLogs.save(setLog);
		return SetLogResponse.from(setLog);
	}

	/**
	 * Một transaction cho cả chuỗi: buổi xong, báo đau, buổi trong lịch DONE, tăng tải. Lỗi ở bước nào
	 * cũng không lưu gì, tránh buổi đã "xong" mà tải chưa tăng (spec chuẩn cấu trúc §5.4).
	 */
	@Transactional
	public SessionResponse finish(UUID userId, UUID sessionId, FinishSessionRequest request) {
		WorkoutSession session = findOwnSessionOrThrow(userId, sessionId);
		session.finish(request == null ? null : request.sessionRpe());
		sessions.save(session);

		if (request != null && request.painReports() != null) {
			for (var p : request.painReports()) {
				painReports.save(new PainReport(sessionId, p.bodyArea(), p.severity(), p.note()));
			}
		}

		if (session.getScheduledWorkoutId() != null) {
			scheduleService.markDone(session.getScheduledWorkoutId());
		}

		progressionApplicationService.applyForFinishedSession(session);

		return withSets(session);
	}

	private SessionResponse withSets(WorkoutSession session) {
		List<SetLog> logs = setLogs.findBySessionId(session.getId());
		return SessionResponse.from(session, logs);
	}

	/** concept-backend-v1.md §5 Lớp 1: findByIdAndUserId, không findById — session của A không lộ cho B. */
	private WorkoutSession findOwnSessionOrThrow(UUID userId, UUID id) {
		return sessions.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi tập"));
	}
}
