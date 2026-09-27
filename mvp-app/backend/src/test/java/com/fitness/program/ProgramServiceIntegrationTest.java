package com.fitness.program;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fitness.content.ProgramTemplate;
import com.fitness.content.ProgramTemplateRepository;
import com.fitness.profile.Profile;
import com.fitness.profile.ProfileRepository;
import com.fitness.support.PostgresIntegrationTest;
import com.fitness.auth.Role;
import com.fitness.auth.User;
import com.fitness.auth.UserRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.server.ResponseStatusException;

/**
 * Dùng thẳng dữ liệu seed thật (R__seed_content.sql: template 'full-body-3x',
 * 'upper-lower-4x', 5 bài) — không seed lại trong test, Flyway đã chạy nó khi
 * context khởi động.
 */
class ProgramServiceIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private ProfileRepository profileRepository;
	@Autowired
	private ProgramTemplateRepository templateRepository;
	@Autowired
	private ProgramService programService;
	@Autowired
	private ProgramRepository programRepository;
	@Autowired
	private ScheduledWorkoutRepository scheduledWorkoutRepository;
	@Autowired
	private ScheduledExerciseRepository scheduledExerciseRepository;

	private UUID userId;
	private static final LocalDate A_MONDAY = LocalDate.of(2026, 9, 7).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));

	@BeforeEach
	void createUser() {
		User user = userRepository.save(new User("tester+" + UUID.randomUUID() + "@example.com", "unused", Role.USER));
		userId = user.getId();
	}

	@Test
	void candidatesMatchSessionsAndEquipment() {
		saveProfile((short) 3, "BARBELL_RACK");

		List<TemplateCandidate> candidates = programService.findCandidateTemplates(userId);

		// Template dùng thiết bị người dùng có đứng trước template tay không cùng số buổi.
		assertThat(candidates.get(0).slug()).isEqualTo("full-body-3x");
		assertThat(candidates.get(0).matchesSessions()).isTrue();
		assertThat(candidates).allMatch(c -> Set.of("BARBELL_RACK").containsAll(c.requiredEquipment()));
		// Đúng số buổi đứng trước, lệch số buổi xếp sau.
		assertThat(candidates).extracting(TemplateCandidate::matchesSessions)
				.isSortedAccordingTo((a, b) -> Boolean.compare(b, a));
		// §5.1: người dùng phải XEM ĐƯỢC cấu trúc trước khi xác nhận
		assertThat(candidates.get(0).days()).isNotEmpty();
		assertThat(candidates.get(0).days().get(0).exercises()).isNotEmpty();
	}

	@Test
	void candidatesStillOfferEquipmentMatchesWhenSessionCountDiffers() {
		// Hồ sơ thật gây lỗi: 6 buổi/tuần, chỉ có giá gánh tạ — trước đây ra danh sách rỗng.
		saveProfile((short) 6, "BARBELL_RACK");

		List<TemplateCandidate> candidates = programService.findCandidateTemplates(userId);

		assertThat(candidates).filteredOn(c -> c.slug().equals("upper-lower-4x"))
				.singleElement().extracting(TemplateCandidate::matchesSessions).isEqualTo(false);
	}

	@Test
	void candidatesNeverNeedEquipmentTheUserLacks() {
		saveProfile((short) 3, "DUMBBELL");

		List<TemplateCandidate> candidates = programService.findCandidateTemplates(userId);

		assertThat(candidates).isNotEmpty();
		assertThat(candidates).allMatch(c -> Set.of("DUMBBELL").containsAll(c.requiredEquipment()));
		assertThat(candidates).extracting(TemplateCandidate::slug).contains("dumbbell-full-body");
	}

	@Test
	void everySessionCountHasAnExactMatchForEveryEquipment() {
		for (String equipment : List.of("BARBELL_RACK", "DUMBBELL", "KETTLEBELL", "BENCH")) {
			for (short sessions = 2; sessions <= 6; sessions++) {
				saveProfile(sessions, equipment);
				assertThat(programService.findCandidateTemplates(userId))
						.as("%s, %d buổi", equipment, sessions)
						.anyMatch(TemplateCandidate::matchesSessions);
			}
		}
	}

	@Test
	void everySeededTemplateGeneratesASchedule() {
		// Slug trong week_structure mà thiếu ở bảng exercises thì createProgram ném lỗi.
		// Liệt kê slug seed thay vì findAll(): test admin khác tạo template nháp cùng DB.
		for (String slug : List.of("full-body-3x", "upper-lower-4x", "bodyweight-full-body",
				"bodyweight-upper-lower", "dumbbell-full-body", "dumbbell-upper-lower-4x",
				"dumbbell-push-pull-legs", "kettlebell-full-body", "strength-3x5", "gym-push-pull-legs")) {
			ProgramTemplate template = templateRepository.findBySlug(slug).orElseThrow();
			UUID programId = programService.createProgram(userId, template.getId(), Map.of(),
					Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), A_MONDAY);
			assertThat(scheduledWorkoutRepository.findByProgramIdOrderByScheduledOn(programId))
					.as(template.getSlug()).isNotEmpty();
		}
	}

	private void saveProfile(short sessions, String... equipment) {
		Profile profile = profileRepository.findById(userId).orElseGet(() -> new Profile(userId));
		profile.patch("STRENGTH", "NEW", sessions, equipment, null, null, true, "DONE");
		profileRepository.save(profile);
	}

	@Test
	void candidatesRejectUserWithoutOnboarding() {
		assertThrows(ResponseStatusException.class, () -> programService.findCandidateTemplates(userId));
	}

	@Test
	void createProgramPersistsScheduleFromTemplate() {
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x"))
				.findFirst().orElseThrow();

		Map<String, Double> startingLoads = Map.of(
				"barbell-back-squat", 60.0,
				"overhead-press", 30.0,
				"bent-over-row", 40.0,
				"romanian-deadlift", 50.0);
		Set<DayOfWeek> restDays = Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

		UUID programId = programService.createProgram(userId, template.getId(), startingLoads, restDays, A_MONDAY);

		assertThat(programRepository.findById(programId)).isPresent();
		assertThat(programRepository.findById(programId).orElseThrow().getStatus()).isEqualTo("ACTIVE");

		List<ScheduledWorkout> workouts = scheduledWorkoutRepository.findByProgramIdOrderByScheduledOn(programId);
		// 4 tuần, nghỉ T7+CN → 5 buổi/tuần thật ra chỉ có 2 entry trong week_structure (A/B)
		// nên chu kỳ lặp: mỗi tuần có 5 ngày tập (T2-T6), 4 tuần = 20 buổi.
		assertThat(workouts).hasSize(20);

		ScheduledWorkout firstWorkout = workouts.get(0);
		assertThat(firstWorkout.getScheduledOn()).isEqualTo(A_MONDAY);

		List<ScheduledExercise> firstDayExercises = scheduledExerciseRepository.findByScheduledWorkoutId(firstWorkout.getId());
		assertThat(firstDayExercises).hasSize(3); // day "A": squat, overhead-press, bent-over-row
	}

	@Test
	void creatingSecondProgramArchivesTheFirst() {
		ProgramTemplate template = templateRepository.findAll().stream()
				.filter(t -> t.getSlug().equals("full-body-3x"))
				.findFirst().orElseThrow();

		UUID firstProgramId = programService.createProgram(userId, template.getId(), Map.of(), Set.of(), A_MONDAY);
		UUID secondProgramId = programService.createProgram(userId, template.getId(), Map.of(), Set.of(), A_MONDAY.plusWeeks(1));

		assertThat(programRepository.findById(firstProgramId).orElseThrow().getStatus()).isEqualTo("ARCHIVED");
		assertThat(programRepository.findById(secondProgramId).orElseThrow().getStatus()).isEqualTo("ACTIVE");
	}
}
