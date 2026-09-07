package com.fitness.program;

import com.fitness.common.CurrentUser;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/programs")
public class ProgramController {

	private final ProgramService programService;
	private final CurrentUser currentUser;

	public ProgramController(ProgramService programService, CurrentUser currentUser) {
		this.programService = programService;
		this.currentUser = currentUser;
	}

	@GetMapping("/candidates")
	public List<TemplateCandidate> candidates() {
		return programService.findCandidateTemplates(currentUser.id()).stream()
				.map(TemplateCandidate::from)
				.toList();
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
}
