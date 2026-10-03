package com.fitness.assistant.service.tools;

import com.fitness.common.CurrentUser;
import com.fitness.content.entity.Exercise;
import com.fitness.content.repository.ExerciseRepository;
import com.fitness.program.entity.LoadDecision;
import com.fitness.program.entity.Program;
import com.fitness.program.entity.ScheduledExercise;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.LoadDecisionRepository;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.workout.dto.ProgressResponse;
import com.fitness.workout.service.ProgressService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Nhóm B — concept-chatbot-v1.md §9: LLM GỌI hàm, không TÍNH. Mọi số trả về
 * đọc thẳng từ DB, không do LLM tự suy ra.
 *
 * Bất biến §9.1: KHÔNG tool nào nhận userId làm tham số. userId luôn lấy từ
 * CurrentUser (SecurityContext), không bao giờ từ input LLM — LLM nhận input
 * từ người dùng, nhận userId làm tham số là đường thẳng tới đọc dữ liệu
 * người khác.
 */
@Component
public class AssistantTools {

	private final CurrentUser currentUser;
	private final ProgramRepository programs;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ExerciseRepository exercises;
	private final LoadDecisionRepository loadDecisions;
	private final ProgressService progressService;
	private final ToolCallLog toolCallLog;

	public AssistantTools(
			CurrentUser currentUser, ProgramRepository programs, ScheduledWorkoutRepository scheduledWorkouts,
			ScheduledExerciseRepository scheduledExercises, ExerciseRepository exercises,
			LoadDecisionRepository loadDecisions, ProgressService progressService, ToolCallLog toolCallLog) {
		this.currentUser = currentUser;
		this.programs = programs;
		this.scheduledWorkouts = scheduledWorkouts;
		this.scheduledExercises = scheduledExercises;
		this.exercises = exercises;
		this.loadDecisions = loadDecisions;
		this.progressService = progressService;
		this.toolCallLog = toolCallLog;
	}

	// ── B2: "Tháng 10 có mấy buổi?", "Ngày mai tập gì?", "Tuần trước bỏ lỡ mấy buổi?" ──

	/** Khoảng dài nhất một lần hỏi — đủ cho "3 tháng tới", không đẩy cả năm lịch vào prompt. */
	static final int MAX_RANGE_DAYS = 93;

	/** dayVi kèm "2/10/2026" vì NumberGuard tách "2026-10-02" thành 2026, 10, 02 — thiếu "2" model hay viết. */
	public record ScheduleDay(LocalDate date, String dayVi, String label, String status, List<ExerciseTarget> exercises) {
	}

	public record ExerciseTarget(String exerciseName, int sets, int repsMin, int repsMax, BigDecimal loadKg) {
	}

	/**
	 * Mọi số đếm (total, byStatus, byLabel) do code tính — bất biến 1: model chỉ đọc lại,
	 * không tự đếm danh sách workouts.
	 */
	public record ScheduleRange(
			boolean hasActiveProgram, String error, LocalDate from, LocalDate to,
			LocalDate programStart, LocalDate programEnd, List<String> restDays, boolean rangeBeyondProgram,
			String exerciseFilter, List<String> matchedExercises,
			int total, Map<String, Integer> byStatus, Map<String, Integer> byLabel,
			ScheduleDay nextWorkout, List<ScheduleDay> workouts) {

		static ScheduleRange failed(boolean hasActiveProgram, String error) {
			return new ScheduleRange(hasActiveProgram, error, null, null, null, null, List.of(), false, null,
					List.of(), 0, Map.of(), Map.of(), null, List.of());
		}
	}

	@Tool(description = "Lấy lịch tập của người dùng đang hỏi trong khoảng ngày [from, to] (gồm cả hai đầu, "
			+ "định dạng yyyy-MM-dd, tối đa " + MAX_RANGE_DAYS + " ngày). Dùng cho MỌI câu hỏi về lịch: hôm nay/"
			+ "ngày mai tập gì, tuần này/tuần sau/tháng này có bao nhiêu buổi, đã tập hay bỏ lỡ mấy buổi, buổi "
			+ "tiếp theo khi nào, ngày nghỉ, chương trình kết thúc khi nào, một bài tập xuất hiện mấy buổi. "
			+ "Lấy from/to từ các mốc ngày (hôm nay, tuần này, tuần sau, tháng này...) ghi kèm câu hỏi, KHÔNG tự "
			+ "cộng trừ ngày. Có exercise thì MỌI kết quả (total, byStatus, workouts, nextWorkout) chỉ tính các "
			+ "buổi có bài đó; matchedExercises rỗng nghĩa là lịch không có bài nào khớp tên. "
			+ "Trả về: total (số buổi), byStatus (PLANNED=chưa tập, DONE=đã tập, MISSED=bỏ lỡ, SKIPPED=bỏ qua), "
			+ "byLabel (theo loại buổi), nextWorkout (buổi chưa tập gần nhất từ hôm nay), restDays, programStart/"
			+ "programEnd; rangeBeyondProgram=true nghĩa là một phần khoảng hỏi nằm ngoài chương trình — phải nói "
			+ "rõ lịch chỉ có từ programStart đến programEnd. Luôn dùng đúng các số đếm này, KHÔNG tự đếm lại "
			+ "danh sách workouts; liệt kê ngày thì liệt kê ĐỦ mọi phần tử của workouts. "
			+ "Không bao giờ hỏi hay đoán userId.")
	public ScheduleRange getSchedule(
			@ToolParam(description = "ngày đầu, yyyy-MM-dd") String from,
			@ToolParam(description = "ngày cuối, yyyy-MM-dd") String to,
			@ToolParam(required = false, description = "tên bài tập khi câu hỏi nói về một bài cụ thể (vd 'squat', "
					+ "'chống đẩy'); bỏ trống nếu không") String exercise) {
		ScheduleRange result = schedule(from, to, exercise);
		toolCallLog.record("getSchedule", result);
		return result;
	}

	private ScheduleRange schedule(String fromText, String toText, String exercise) {
		Optional<Program> program = programs.findByUserIdAndStatus(currentUser.id(), "ACTIVE");
		if (program.isEmpty()) {
			return ScheduleRange.failed(false, "Người dùng chưa có chương trình tập đang chạy.");
		}
		LocalDate from;
		LocalDate to;
		try {
			from = LocalDate.parse(fromText);
			to = LocalDate.parse(toText);
		} catch (RuntimeException e) {
			return ScheduleRange.failed(true, "from/to phải có dạng yyyy-MM-dd.");
		}
		if (to.isBefore(from) || from.plusDays(MAX_RANGE_DAYS - 1).isBefore(to)) {
			return ScheduleRange.failed(true,
					"Khoảng ngày không hợp lệ: to phải từ from trở đi và dài tối đa " + MAX_RANGE_DAYS + " ngày.");
		}

		LocalDate today = LocalDate.now();
		List<ScheduledWorkout> all = scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.get().getId());
		Map<UUID, Exercise> exerciseById = exercises.findAll().stream()
				.collect(java.util.stream.Collectors.toMap(Exercise::getId, e -> e));

		// Có exercise thì lọc TOÀN BỘ kết quả (total, byStatus, workouts, nextWorkout) theo bài đó.
		// 10-02 thử thật: để riêng một trường đếm bên cạnh total thì model đọc total (12) thay vì 6.
		String filter = exercise == null || exercise.isBlank() ? null : exercise.strip().toLowerCase(Locale.ROOT);
		List<ScheduledWorkout> matching = filter == null ? all : all.stream()
				.filter(w -> exercisesOf(w, exerciseById).anyMatch(e -> matches(e, filter)))
				.toList();
		List<String> matchedExercises = filter == null ? List.of() : matching.stream()
				.flatMap(w -> exercisesOf(w, exerciseById))
				.filter(e -> matches(e, filter))
				.map(AssistantTools::displayName)
				.distinct()
				.toList();

		List<ScheduleDay> days = matching.stream()
				.filter(w -> !w.getScheduledOn().isBefore(from) && !w.getScheduledOn().isAfter(to))
				.map(w -> toDay(w, today, exerciseById))
				.toList();

		// Đủ 4 trạng thái kể cả 0 — "bỏ lỡ 0 buổi" là câu trả lời, không phải thiếu dữ liệu.
		Map<String, Integer> byStatus = new LinkedHashMap<>();
		List.of("PLANNED", "DONE", "MISSED", "SKIPPED").forEach(s -> byStatus.put(s, 0));
		Map<String, Integer> byLabel = new LinkedHashMap<>();
		days.forEach(d -> {
			byStatus.merge(d.status(), 1, Integer::sum);
			byLabel.merge(d.label(), 1, Integer::sum);
		});

		LocalDate programStart = program.get().getStartDate();
		LocalDate programEnd = all.isEmpty() ? programStart : all.get(all.size() - 1).getScheduledOn();
		ScheduleDay next = matching.stream()
				.filter(w -> "PLANNED".equals(w.getStatus()) && !w.getScheduledOn().isBefore(today))
				.findFirst()
				.map(w -> toDay(w, today, exerciseById))
				.orElse(null);

		return new ScheduleRange(true, null, from, to, programStart, programEnd,
				Arrays.stream(program.get().getRestDays()).map(d -> dayName(DayOfWeek.of(d))).toList(),
				from.isBefore(programStart) || to.isAfter(programEnd),
				filter, matchedExercises, days.size(), byStatus, byLabel, next, days);
	}

	private Stream<Exercise> exercisesOf(ScheduledWorkout w, Map<UUID, Exercise> exerciseById) {
		return scheduledExercises.findByScheduledWorkoutId(w.getId()).stream()
				.map(se -> exerciseById.get(se.getExerciseId()))
				.filter(java.util.Objects::nonNull);
	}

	private static boolean matches(Exercise e, String filter) {
		return Stream.of(e.getNameVi(), e.getNameEn(), e.getSlug())
				.anyMatch(name -> name != null && name.toLowerCase(Locale.ROOT).contains(filter));
	}

	private static String displayName(Exercise e) {
		return e.getNameVi() != null ? e.getNameVi() : e.getNameEn();
	}

	private ScheduleDay toDay(ScheduledWorkout w, LocalDate today, Map<UUID, Exercise> exerciseById) {
		return new ScheduleDay(w.getScheduledOn(), dayVi(w.getScheduledOn()), w.getLabel(), w.displayStatus(today),
				scheduledExercises.findByScheduledWorkoutId(w.getId()).stream()
						.sorted(Comparator.comparingInt(ScheduledExercise::getOrderIndex))
						.map(se -> toTarget(se, exerciseById))
						.toList());
	}

	/** "Thứ 6, 2/10/2026" — dạng người Việt đọc và model hay chép lại nguyên văn. */
	public static String dayVi(LocalDate date) {
		return dayName(date.getDayOfWeek()) + ", " + date.getDayOfMonth() + "/" + date.getMonthValue() + "/"
				+ date.getYear();
	}

	private static String dayName(DayOfWeek day) {
		return day == DayOfWeek.SUNDAY ? "Chủ nhật" : "Thứ " + (day.getValue() + 1);
	}

	private ExerciseTarget toTarget(ScheduledExercise se, Map<UUID, Exercise> exerciseById) {
		Exercise exercise = exerciseById.get(se.getExerciseId());
		return new ExerciseTarget(exercise == null ? "?" : displayName(exercise), se.getTargetSets(), se.getTargetReps(), se.getTargetRepsMax(),
				se.getTargetLoadKg());
	}

	// ── B1: "Tại sao tuần này giảm tải?" ────────────────────────────────────

	public record LoadChangeExplanation(
			boolean exerciseFound, boolean decisionFound, String exerciseName, String direction,
			BigDecimal deltaKg, String explanation) {
	}

	@Tool(description = "Giải thích vì sao tải (mức tạ) của MỘT bài tập cụ thể vừa tăng, giảm, hay giữ nguyên "
			+ "ở lần gần nhất. Trả về đúng lời giải thích đã lưu trong hệ thống, không tự bịa lý do khác.")
	public LoadChangeExplanation explainLoadChange(
			@ToolParam(description = "slug của bài tập, ví dụ 'barbell-back-squat'") String exerciseSlug) {
		Optional<Exercise> exercise = exercises.findBySlug(exerciseSlug);
		if (exercise.isEmpty()) {
			return logAndReturn(new LoadChangeExplanation(false, false, null, null, null,
					"Không tìm thấy bài tập với slug '" + exerciseSlug + "'."));
		}
		Optional<LoadDecision> decision = loadDecisions
				.findFirstByUserIdAndExerciseIdOrderByEffectiveFromDesc(currentUser.id(), exercise.get().getId());
		if (decision.isEmpty()) {
			return logAndReturn(new LoadChangeExplanation(true, false, exercise.get().getNameVi(), null, null,
					"Chưa có quyết định thay đổi tải nào được ghi nhận cho bài này."));
		}
		LoadDecision d = decision.get();
		return logAndReturn(new LoadChangeExplanation(true, true, exercise.get().getNameVi(), d.getDirection(),
				d.getDeltaKg(), d.getMessageVi()));
	}

	private LoadChangeExplanation logAndReturn(LoadChangeExplanation result) {
		toolCallLog.record("explainLoadChange", result);
		return result;
	}

	// ── B3: "Tiến bộ thế nào?" ───────────────────────────────────────────────

	public record ProgressSummary(
			int weeks, long sessionsStarted, long sessionsFinished, BigDecimal totalTonnageKg, Double avgSessionRpe) {
	}

	// Mô tả nói rõ "đã bấm bắt đầu tập": 10-02 model dùng tool này cho "tháng 10 có bao nhiêu buổi"
	// và trả lời 0 vì người dùng chưa tập buổi nào, trong khi lịch có 20 buổi.
	@Tool(description = "Tóm tắt tiến bộ tập luyện N tuần gần nhất: số buổi người dùng ĐÃ BẤM BẮT ĐẦU / HOÀN "
			+ "THÀNH, tổng khối lượng đã nâng (tonnage, kg), RPE trung bình mỗi buổi. KHÔNG đếm buổi có trong lịch "
			+ "— hỏi lịch có bao nhiêu buổi, đã tập hay bỏ lỡ mấy buổi theo lịch thì dùng getSchedule.")
	public ProgressSummary getProgressSummary(
			@ToolParam(description = "số tuần muốn xem lại, ví dụ 4") int weeks) {
		// Cùng phép tính với màn Cài đặt › Tiến bộ — trợ lý và màn đó luôn ra cùng số.
		ProgressResponse p = progressService.summary(currentUser.id(), weeks);
		ProgressSummary result = new ProgressSummary(
				p.weeks(), p.sessionsStarted(), p.sessionsFinished(), p.totalTonnageKg(), p.avgSessionRpe());
		toolCallLog.record("getProgressSummary", result);
		return result;
	}
}
