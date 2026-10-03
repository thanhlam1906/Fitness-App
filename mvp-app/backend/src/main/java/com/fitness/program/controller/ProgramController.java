package com.fitness.program.controller;

import com.fitness.common.CurrentUser;
import com.fitness.content.repository.ProgramTemplateRepository;
import com.fitness.program.dto.CreateCustomProgramRequest;
import com.fitness.program.dto.CreateProgramRequest;
import com.fitness.program.dto.CreateProgramResponse;
import com.fitness.program.dto.CurrentProgramResponse;
import com.fitness.program.dto.TemplateCandidateResponse;
import com.fitness.program.dto.TrainingDaysRequest;
import com.fitness.program.dto.TrainingDaysResponse;
import com.fitness.program.entity.Program;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.service.ProgramEditService;
import com.fitness.program.service.ProgramService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/programs")
public class ProgramController {

	private final ProgramService programService;
	private final ProgramRepository programs;
	private final ProgramTemplateRepository templates;
	private final CurrentUser currentUser;
	private final ProgramEditService programEdits;

	public ProgramController(
			ProgramService programService, ProgramRepository programs,
			ProgramTemplateRepository templates, CurrentUser currentUser, ProgramEditService programEdits) {
		this.programService = programService;
		this.programs = programs;
		this.templates = templates;
		this.currentUser = currentUser;
		this.programEdits = programEdits;
	}

	@GetMapping("/candidates")
	public List<TemplateCandidateResponse> candidates() {
		return programService.findCandidateTemplates(currentUser.id());
	}

	@GetMapping("/current")
	public CurrentProgramResponse current() {
		Program program = programs.findByUserIdAndStatus(currentUser.id(), "ACTIVE")
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có chương trình đang chạy"));
		return program.getTemplateId() == null
				? CurrentProgramResponse.ofCustom(program)
				: CurrentProgramResponse.of(program, templates.findById(program.getTemplateId()).orElseThrow());
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CreateProgramResponse create(@Valid @RequestBody CreateProgramRequest request) {
		Map<String, Double> startingLoads = request.startingLoadsBySlug() == null ? Map.of() : request.startingLoadsBySlug();
		Set<DayOfWeek> restDays = request.restDays() == null ? Set.of()
				: request.restDays().stream().map(DayOfWeek::of).collect(Collectors.toSet());
		LocalDate startDate = request.startDate() == null ? LocalDate.now() : request.startDate();

		UUID programId = programService.createProgram(
				currentUser.id(), request.templateId(), startingLoads, restDays, startDate);
		return new CreateProgramResponse(programId);
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
