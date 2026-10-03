package com.fitness.workout.controller;

import com.fitness.common.CurrentUser;
import com.fitness.workout.dto.FinishSessionRequest;
import com.fitness.workout.dto.SessionResponse;
import com.fitness.workout.dto.SetLogRequest;
import com.fitness.workout.dto.SetLogResponse;
import com.fitness.workout.dto.StartSessionRequest;
import com.fitness.workout.service.WorkoutSessionService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Màn 5–6 concept-frontend-v1.md — buổi tập, log set, kết buổi. */
@RestController
@RequestMapping("/api/v1/sessions")
public class WorkoutSessionController {

	private final WorkoutSessionService sessionService;
	private final CurrentUser currentUser;

	public WorkoutSessionController(WorkoutSessionService sessionService, CurrentUser currentUser) {
		this.sessionService = sessionService;
		this.currentUser = currentUser;
	}

	/** 201 chỉ khi thật sự tạo buổi mới; trả lại buổi đang dở thì 200. */
	@PostMapping
	public ResponseEntity<SessionResponse> start(@Valid @RequestBody StartSessionRequest request) {
		WorkoutSessionService.Started started = sessionService.start(currentUser.id(), request);
		return ResponseEntity.status(started.created() ? HttpStatus.CREATED : HttpStatus.OK).body(started.session());
	}

	@GetMapping("/{id}")
	public SessionResponse get(@PathVariable UUID id) {
		return sessionService.get(currentUser.id(), id);
	}

	@GetMapping(params = "scheduledWorkoutId")
	public SessionResponse getByScheduledWorkout(@RequestParam UUID scheduledWorkoutId) {
		return sessionService.getByScheduledWorkout(currentUser.id(), scheduledWorkoutId);
	}

	@PostMapping("/{id}/sets")
	public SetLogResponse logSet(@PathVariable UUID id, @Valid @RequestBody SetLogRequest request) {
		return sessionService.logSet(currentUser.id(), id, request);
	}

	@PostMapping("/{id}/finish")
	public SessionResponse finish(@PathVariable UUID id, @RequestBody FinishSessionRequest request) {
		return sessionService.finish(currentUser.id(), id, request);
	}
}
