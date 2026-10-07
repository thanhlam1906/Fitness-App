package com.fitness.program.controller;

import com.fitness.common.CurrentUser;
import com.fitness.program.dto.AddExerciseRequest;
import com.fitness.program.dto.EditDayRequest;
import com.fitness.program.dto.EditDayResponse;
import com.fitness.program.dto.ScheduleResponse;
import com.fitness.program.dto.ScheduledExerciseResponse;
import com.fitness.program.dto.SubstituteRequest;
import com.fitness.program.dto.UpdateExerciseRequest;
import com.fitness.program.service.ProgramEditService;
import com.fitness.program.service.ScheduleService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Màn 4 concept-frontend-v1.md — "Lịch tuần", màn chính, nguồn sự thật. */
@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

	private final ScheduleService scheduleService;
	private final ProgramEditService programEdits;
	private final CurrentUser currentUser;

	public ScheduleController(ScheduleService scheduleService, ProgramEditService programEdits, CurrentUser currentUser) {
		this.scheduleService = scheduleService;
		this.programEdits = programEdits;
		this.currentUser = currentUser;
	}

	@GetMapping
	public ScheduleResponse get() {
		return scheduleService.get(currentUser.id());
	}

	@PostMapping("/exercises/{scheduledExerciseId}/substitute")
	public ScheduledExerciseResponse substitute(
			@PathVariable UUID scheduledExerciseId, @RequestBody SubstituteRequest request) {
		return scheduleService.substitute(currentUser.id(), scheduledExerciseId, request);
	}

	@PutMapping("/exercises/{scheduledExerciseId}")
	public ScheduledExerciseResponse updateExercise(
			@PathVariable UUID scheduledExerciseId, @Valid @RequestBody UpdateExerciseRequest request) {
		return scheduleService.updateExercise(currentUser.id(), scheduledExerciseId, request);
	}

	@PostMapping("/workouts/{scheduledWorkoutId}/exercises")
	@ResponseStatus(HttpStatus.CREATED)
	public ScheduledExerciseResponse addExercise(
			@PathVariable UUID scheduledWorkoutId, @Valid @RequestBody AddExerciseRequest request) {
		return scheduleService.addExercise(currentUser.id(), scheduledWorkoutId, request);
	}

	@DeleteMapping("/exercises/{scheduledExerciseId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeExercise(@PathVariable UUID scheduledExerciseId) {
		scheduleService.removeExercise(currentUser.id(), scheduledExerciseId);
	}

	/** Sửa một loại buổi cho mọi buổi còn lại (doc/design-chuong-trinh-v1.md §4.1). */
	@PutMapping("/days")
	public EditDayResponse editDay(@Valid @RequestBody EditDayRequest request) {
		return new EditDayResponse(programEdits.editDay(currentUser.id(), request));
	}
}
