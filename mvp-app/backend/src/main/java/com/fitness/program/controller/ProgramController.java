package com.fitness.program.controller;

import com.fitness.common.CurrentUser;
import com.fitness.program.dto.CreateCustomProgramRequest;
import com.fitness.program.dto.CreateProgramRequest;
import com.fitness.program.dto.CreateProgramResponse;
import com.fitness.program.dto.CurrentProgramResponse;
import com.fitness.program.dto.TemplateCandidateResponse;
import com.fitness.program.dto.TrainingDaysRequest;
import com.fitness.program.dto.TrainingDaysResponse;
import com.fitness.program.service.ProgramEditService;
import com.fitness.program.service.ProgramService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/programs")
public class ProgramController {

	private final ProgramService programService;
	private final ProgramEditService programEdits;
	private final CurrentUser currentUser;

	public ProgramController(ProgramService programService, ProgramEditService programEdits, CurrentUser currentUser) {
		this.programService = programService;
		this.programEdits = programEdits;
		this.currentUser = currentUser;
	}

	@GetMapping("/candidates")
	public List<TemplateCandidateResponse> candidates() {
		return programService.findCandidateTemplates(currentUser.id());
	}

	@GetMapping("/current")
	public CurrentProgramResponse current() {
		return programService.current(currentUser.id());
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CreateProgramResponse create(@Valid @RequestBody CreateProgramRequest request) {
		return programService.create(currentUser.id(), request);
	}

	@PostMapping("/custom")
	@ResponseStatus(HttpStatus.CREATED)
	public CreateProgramResponse createCustom(@Valid @RequestBody CreateCustomProgramRequest request) {
		return new CreateProgramResponse(programService.createCustomProgram(currentUser.id(), request));
	}

	/** Đổi ngày tập trong tuần (doc/design-chuong-trinh-v1.md §4.2). */
	@PutMapping("/current/training-days")
	public TrainingDaysResponse changeTrainingDays(@Valid @RequestBody TrainingDaysRequest request) {
		return new TrainingDaysResponse(programEdits.changeTrainingDays(currentUser.id(), request.days()));
	}
}
