package com.fitness.program;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.content.Exercise;
import com.fitness.content.ExerciseRepository;
import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * §5.1 ke-hoach-chi-tiet-chuc-nang-v1.md: chọn template theo số buổi/tuần và
 * thiết bị, rồi sinh lịch bằng ScheduleGenerator. Matching viết thẳng bằng
 * query + filter trong Java — chỉ vài template, không cần lớp TemplateMatcher
 * riêng để unit-test tách biệt.
 */
@Service
public class ProgramService {

	private static final int WEEKS_TO_GENERATE = 4;

	private final ProgramTemplateRepository templateRepository;
	private final ProfileRepository profileRepository;
	private final ExerciseRepository exerciseRepository;
	private final ProgramRepository programRepository;
	private final ScheduledWorkoutRepository scheduledWorkoutRepository;
	private final ScheduledExerciseRepository scheduledExerciseRepository;
	private final ObjectMapper objectMapper;
	private final ScheduleGenerator scheduleGenerator = new ScheduleGenerator();

	public ProgramService(
			ProgramTemplateRepository templateRepository,
			ProfileRepository profileRepository,
			ExerciseRepository exerciseRepository,
			ProgramRepository programRepository,
			ScheduledWorkoutRepository scheduledWorkoutRepository,
			ScheduledExerciseRepository scheduledExerciseRepository,
			ObjectMapper objectMapper) {
		this.templateRepository = templateRepository;
		this.profileRepository = profileRepository;
		this.exerciseRepository = exerciseRepository;
		this.programRepository = programRepository;
		this.scheduledWorkoutRepository = scheduledWorkoutRepository;
		this.scheduledExerciseRepository = scheduledExerciseRepository;
		this.objectMapper = objectMapper;
	}

	public List<TemplateCandidate> findCandidateTemplates(UUID userId) {
		Profile profile = profileRepository.findById(userId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có hồ sơ onboarding"));
		if (profile.getSessionsPerWeek() == null) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Hồ sơ chưa có số buổi/tuần");
		}
		short sessions = profile.getSessionsPerWeek();
		Set<String> userEquipment = Set.of(profile.getEquipment());

		return templateRepository
				.findByActiveTrueAndSessionsMinLessThanEqualAndSessionsMaxGreaterThanEqual(sessions, sessions)
				.stream()
				.filter(t -> userEquipment.containsAll(List.of(t.getRequiredEquipment())))
				.map(this::toCandidate)
				.toList();
	}

	private TemplateCandidate toCandidate(ProgramTemplate template) {
		List<CycleDay> weekStructure = parseWeekStructure(template.getWeekStructure());
		Map<String, Exercise> bySlug = exerciseRepository.findBySlugIn(
				weekStructure.stream().flatMap(d -> d.exercises().stream())
						.map(CycleExercise::exerciseSlug).distinct().toList())
				.stream().collect(Collectors.toMap(Exercise::getSlug, e -> e));

		List<TemplateCandidate.CycleDayView> days = weekStructure.stream()
				.map(d -> new TemplateCandidate.CycleDayView(d.order(), d.label(), d.exercises().stream()
						.map(ex -> toExerciseView(ex, bySlug.get(ex.exerciseSlug())))
						.toList()))
				.toList();

		return new TemplateCandidate(
				template.getId(), template.getSlug(), template.getName(), template.getMethodology(),
				template.getSessionsMin(), template.getSessionsMax(),
				List.of(template.getRequiredEquipment()), days);
	}

	private TemplateCandidate.CycleExerciseView toExerciseView(CycleExercise ex, Exercise exercise) {
		// Bài trong template mà chưa có trong bảng exercises: hiển thị slug và
		// coi như cần tạ. createProgram sẽ báo lỗi rõ ràng khi người dùng xác nhận.
		String name = exercise == null ? ex.exerciseSlug()
				: (exercise.getNameVi() != null ? exercise.getNameVi() : exercise.getNameEn());
		boolean needsLoad = exercise == null || exercise.getEquipment().length > 0;
		return new TemplateCandidate.CycleExerciseView(
				ex.exerciseSlug(), name, ex.sets(), ex.repsMin(), ex.repsMax(), ex.restSec(), needsLoad);
	}

	@Transactional
	public UUID createProgram(UUID userId, UUID templateId, Map<String, Double> startingLoadsBySlug,
			Set<DayOfWeek> restDays, LocalDate startDate) {
		ProgramTemplate template = templateRepository.findById(templateId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy template"));

		// saveAndFlush bắt buộc: Hibernate flush INSERT trước UPDATE trong cùng
		// transaction bất kể thứ tự gọi code, nên nếu không flush ngay ở đây,
		// INSERT chương trình mới chạy trước UPDATE archive → vi phạm
		// one_active_program_per_user (2 dòng ACTIVE cùng lúc, dù chỉ tạm thời).
		programRepository.findByUserIdAndStatus(userId, "ACTIVE").ifPresent(existing -> {
			existing.archive();
			programRepository.saveAndFlush(existing);
		});

		List<CycleDay> weekStructure = parseWeekStructure(template.getWeekStructure());
		List<GeneratedWorkout> generated = scheduleGenerator.generate(
				weekStructure, startingLoadsBySlug, restDays, startDate, WEEKS_TO_GENERATE);

		Map<String, UUID> exerciseIdBySlug = resolveExerciseIds(weekStructure);

		Program program = new Program(userId, templateId, writeJson(startingLoadsBySlug),
				restDays.stream().map(d -> (short) d.getValue()).toArray(Short[]::new), startDate);
		programRepository.save(program);

		for (GeneratedWorkout workout : generated) {
			ScheduledWorkout scheduledWorkout = new ScheduledWorkout(
					program.getId(), workout.scheduledOn(), (short) workout.weekIndex(), workout.label());
			scheduledWorkoutRepository.save(scheduledWorkout);

			for (GeneratedExercise ex : workout.exercises()) {
				UUID exerciseId = exerciseIdBySlug.get(ex.exerciseSlug());
				if (exerciseId == null) {
					throw new IllegalStateException(
							"Bài '" + ex.exerciseSlug() + "' trong template chưa có trong bảng exercises");
				}
				BigDecimal targetLoadKg = ex.targetLoadKg() == null ? null : BigDecimal.valueOf(ex.targetLoadKg());
				scheduledExerciseRepository.save(new ScheduledExercise(
						scheduledWorkout.getId(), exerciseId, (short) ex.orderIndex(),
						(short) ex.targetSets(), (short) ex.targetReps(), (short) ex.targetRepsMax(), targetLoadKg,
						(short) ex.restSeconds()));
			}
		}

		return program.getId();
	}

	/**
	 * Lịch tự thiết kế: sinh thẳng từ input người dùng, template_id = null.
	 * Không gắn progression — người dùng đã tự đặt set/rep/tạ, engine chỉnh vào
	 * đó là chỉnh đè lên ý muốn của họ (ProgressionApplicationService bỏ qua
	 * chương trình không có template).
	 */
	@Transactional
	public UUID createCustomProgram(UUID userId, CreateCustomProgramRequest request) {
		LocalDate startDate = request.startDate() == null ? LocalDate.now() : request.startDate();
		int weeks = request.weeksToGenerate() == null ? WEEKS_TO_GENERATE : request.weeksToGenerate();

		Map<DayOfWeek, CreateCustomProgramRequest.CustomDay> dayByWeekday = new HashMap<>();
		for (CreateCustomProgramRequest.CustomDay day : request.days()) {
			if (dayByWeekday.put(DayOfWeek.of(day.dayOfWeek()), day) != null) {
				throw new ResponseStatusException(
						HttpStatus.BAD_REQUEST, "Mỗi thứ trong tuần chỉ cấu hình được một lần");
			}
		}

		requireKnownExercises(request);

		// saveAndFlush như createProgram: INSERT chương trình mới trước UPDATE
		// archive sẽ vi phạm one_active_program_per_user.
		programRepository.findByUserIdAndStatus(userId, "ACTIVE").ifPresent(existing -> {
			existing.archive();
			programRepository.saveAndFlush(existing);
		});

		Short[] restDays = Arrays.stream(DayOfWeek.values())
				.filter(d -> !dayByWeekday.containsKey(d))
				.map(d -> (short) d.getValue())
				.toArray(Short[]::new);
		Program program = new Program(userId, null, "{}", restDays, startDate);
		programRepository.save(program);

		for (LocalDate date : scheduleGenerator.customDates(dayByWeekday.keySet(), startDate, weeks)) {
			CreateCustomProgramRequest.CustomDay day = dayByWeekday.get(date.getDayOfWeek());
			int weekIndex = (int) (ChronoUnit.DAYS.between(startDate, date) / 7) + 1;
			ScheduledWorkout workout = new ScheduledWorkout(
					program.getId(), date, (short) weekIndex, day.label());
			scheduledWorkoutRepository.save(workout);

			short orderIndex = 1;
			for (CreateCustomProgramRequest.CustomExercise ex : day.exercises()) {
				scheduledExerciseRepository.save(new ScheduledExercise(
						workout.getId(), ex.exerciseId(), orderIndex++,
						ex.sets().shortValue(), ex.repsMin().shortValue(), ex.repsMax().shortValue(),
						ex.loadKg() == null ? null : BigDecimal.valueOf(ex.loadKg()),
						ex.restSeconds() == null ? null : ex.restSeconds().shortValue()));
			}
		}

		return program.getId();
	}

	private void requireKnownExercises(CreateCustomProgramRequest request) {
		List<UUID> ids = request.days().stream()
				.flatMap(d -> d.exercises().stream())
				.map(CreateCustomProgramRequest.CustomExercise::exerciseId)
				.distinct()
				.toList();
		Map<UUID, Exercise> byId = exerciseRepository.findAllById(ids).stream()
				.collect(Collectors.toMap(Exercise::getId, e -> e));
		for (UUID id : ids) {
			Exercise exercise = byId.get(id);
			if (exercise == null || !exercise.isActive()) {
				throw new ResponseStatusException(
						HttpStatus.BAD_REQUEST, "Bài tập không tồn tại hoặc đã ngưng dùng: " + id);
			}
		}
	}

	private Map<String, UUID> resolveExerciseIds(List<CycleDay> weekStructure) {
		List<String> slugs = weekStructure.stream()
				.flatMap(d -> d.exercises().stream())
				.map(CycleExercise::exerciseSlug)
				.distinct()
				.toList();
		return exerciseRepository.findBySlugIn(slugs).stream()
				.collect(Collectors.toMap(Exercise::getSlug, Exercise::getId));
	}

	private List<CycleDay> parseWeekStructure(String json) {
		try {
			return objectMapper.readValue(json, new TypeReference<List<CycleDay>>() {
			});
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("week_structure JSON hỏng", e);
		}
	}

	private String writeJson(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException(e);
		}
	}
}
