package com.fitness.workout;

import com.fitness.common.CurrentUser;
import com.fitness.program.ScheduledWorkout;
import com.fitness.program.ScheduledWorkoutRepository;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Màn 5–6 concept-frontend-v1.md — buổi tập, log set, kết buổi. */
@RestController
@RequestMapping("/api/v1/sessions")
public class WorkoutSessionController {

	private final WorkoutSessionRepository sessions;
	private final SetLogRepository setLogs;
	private final PainReportRepository painReports;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ProgressionApplicationService progressionApplicationService;
	private final CurrentUser currentUser;

	public WorkoutSessionController(
			WorkoutSessionRepository sessions, SetLogRepository setLogs, PainReportRepository painReports,
			ScheduledWorkoutRepository scheduledWorkouts, ProgressionApplicationService progressionApplicationService,
			CurrentUser currentUser) {
		this.sessions = sessions;
		this.setLogs = setLogs;
		this.painReports = painReports;
		this.scheduledWorkouts = scheduledWorkouts;
		this.progressionApplicationService = progressionApplicationService;
		this.currentUser = currentUser;
	}

	/**
	 * Idempotent theo scheduledWorkoutId: buổi đang dở của cùng lịch thì trả lại
	 * chính nó (200) kèm các set đã log, không tạo session thứ hai (201 chỉ khi
	 * thật sự tạo mới). Đây là cơ chế resume ở §5.1 concept-frontend-v1.md —
	 * khoá màn hình giữa buổi rồi mở lại, kể cả trên máy khác, vẫn đúng chỗ dở.
	 */
	@PostMapping
	public ResponseEntity<SessionResponse> start(@Valid @RequestBody StartSessionRequest request) {
		if (request.scheduledWorkoutId() != null) {
			var existing = sessions.findByUserIdAndScheduledWorkoutIdAndStatus(
					currentUser.id(), request.scheduledWorkoutId(), "IN_PROGRESS");
			if (existing.isPresent()) {
				return ResponseEntity.ok(withSets(existing.get()));
			}
		}
		WorkoutSession session = new WorkoutSession(currentUser.id(), request.scheduledWorkoutId());
		sessions.save(session);
		return ResponseEntity.status(HttpStatus.CREATED).body(withSets(session));
	}

	@GetMapping("/{id}")
	public SessionResponse get(@PathVariable UUID id) {
		return withSets(findOwnSessionOrThrow(id));
	}

	@PostMapping("/{id}/sets")
	public SetLogResponse logSet(@PathVariable UUID id, @Valid @RequestBody SetLogRequest request) {
		findOwnSessionOrThrow(id);
		SetLog setLog = setLogs.findBySessionIdAndExerciseIdAndSetIndex(id, request.exerciseId(), request.setIndex())
				.orElseGet(() -> new SetLog(id, request.exerciseId(), request.setIndex()));
		setLog.apply(
				request.targetReps(), request.reps(), request.loadKg(), request.rpe(),
				request.skipped(), request.skipReason());
		setLogs.save(setLog);
		return SetLogResponse.from(setLog);
	}

	@PostMapping("/{id}/finish")
	public SessionResponse finish(@PathVariable UUID id, @RequestBody FinishSessionRequest request) {
		WorkoutSession session = findOwnSessionOrThrow(id);
		session.finish(request == null ? null : request.sessionRpe());
		sessions.save(session);

		if (request != null && request.painReports() != null) {
			for (var p : request.painReports()) {
				painReports.save(new PainReport(id, p.bodyArea(), p.severity(), p.note()));
			}
		}

		if (session.getScheduledWorkoutId() != null) {
			ScheduledWorkout workout = scheduledWorkouts.findById(session.getScheduledWorkoutId()).orElseThrow();
			workout.updateStatus("DONE");
			scheduledWorkouts.save(workout);
		}

		progressionApplicationService.applyForFinishedSession(session);

		return withSets(session);
	}

	private SessionResponse withSets(WorkoutSession session) {
		List<SetLog> logs = setLogs.findBySessionId(session.getId());
		return SessionResponse.from(session, logs);
	}

	/** concept-backend-v1.md §5 Lớp 1: findByIdAndUserId, không findById — session của A không lộ cho B. */
	private WorkoutSession findOwnSessionOrThrow(UUID id) {
		return sessions.findByIdAndUserId(id, currentUser.id())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy buổi tập"));
	}
}
