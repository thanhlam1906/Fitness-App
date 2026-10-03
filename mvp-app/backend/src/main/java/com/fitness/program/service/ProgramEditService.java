package com.fitness.program.service;

import com.fitness.content.repository.ExerciseRepository;
import com.fitness.program.dto.EditDayRequest;
import com.fitness.program.entity.Program;
import com.fitness.program.entity.ScheduledExercise;
import com.fitness.program.entity.ScheduledWorkout;
import com.fitness.program.repository.ProgramRepository;
import com.fitness.program.repository.ScheduledExerciseRepository;
import com.fitness.program.repository.ScheduledWorkoutRepository;
import com.fitness.workout.repository.WorkoutSessionRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sửa ở cấp chương trình (doc/design-chuong-trinh-v1.md §4). Chỉ đụng "buổi mở": PLANNED,
 * từ hôm nay, không đang tập dở. Buổi đã tập là lịch sử, buổi quá hạn giữ để báo bỏ lỡ.
 */
@Service
public class ProgramEditService {

	private final ProgramRepository programs;
	private final ScheduledWorkoutRepository scheduledWorkouts;
	private final ScheduledExerciseRepository scheduledExercises;
	private final ExerciseRepository exercises;
	private final WorkoutSessionRepository sessions;

	public ProgramEditService(
			ProgramRepository programs, ScheduledWorkoutRepository scheduledWorkouts,
			ScheduledExerciseRepository scheduledExercises, ExerciseRepository exercises,
			WorkoutSessionRepository sessions) {
		this.programs = programs;
		this.scheduledWorkouts = scheduledWorkouts;
		this.scheduledExercises = scheduledExercises;
		this.exercises = exercises;
		this.sessions = sessions;
	}

	/** Một transaction: hỏng ở buổi nào thì không buổi nào đổi. Trả số buổi đã sửa. */
	@Transactional
	public int editDay(UUID userId, EditDayRequest request) {
		if (Stream.of(request.remove(), request.update(), request.add())
				.filter(Objects::nonNull).anyMatch(list -> list.contains(null))) {
			throw badRequest("Dữ liệu sửa buổi không hợp lệ");
		}
		List<EditDayRequest.ExerciseTargetRequest> update = orEmpty(request.update());
		List<EditDayRequest.ExerciseTargetRequest> add = orEmpty(request.add());
		Set<UUID> remove = Set.copyOf(orEmpty(request.remove()));
		if (Stream.concat(update.stream(), add.stream()).anyMatch(t -> t.targetRepsMax() < t.targetReps())) {
			throw badRequest("Rep đến phải lớn hơn hoặc bằng rep từ");
		}
		for (EditDayRequest.ExerciseTargetRequest t : add) {
			if (!exercises.existsById(t.exerciseId())) {
				throw badRequest("Bài tập không tồn tại");
			}
		}

		Program program = activeProgramOrThrow(userId);
		List<ScheduledWorkout> open = openWorkouts(userId, program).stream()
				.filter(w -> request.label().equals(w.getLabel()))
				.toList();
		if (open.isEmpty()) {
			throw new ResponseStatusException(
					HttpStatus.CONFLICT, "Không còn buổi " + request.label() + " nào chưa tập");
		}

		Map<UUID, EditDayRequest.ExerciseTargetRequest> updateByExercise = update.stream()
				.collect(Collectors.toMap(EditDayRequest.ExerciseTargetRequest::exerciseId, Function.identity(), (a, b) -> b));
		for (ScheduledWorkout workout : open) {
			List<ScheduledExercise> rows = scheduledExercises.findByScheduledWorkoutId(workout.getId());
			Set<UUID> present = new HashSet<>();
			for (ScheduledExercise row : rows) {
				if (remove.contains(row.getExerciseId())) {
					scheduledExercises.delete(row);
					continue;
				}
				present.add(row.getExerciseId());
				EditDayRequest.ExerciseTargetRequest t = updateByExercise.get(row.getExerciseId());
				if (t != null) {
					row.updateTargets(t.targetSets(), t.targetReps(), t.targetRepsMax(), t.targetLoadKg(),
							row.getRestSeconds() == null ? null : (int) row.getRestSeconds());
					scheduledExercises.save(row);
				}
			}
			// max+1 tính cả dòng vừa xoá: Hibernate chạy INSERT trước DELETE, không đụng order_index cũ.
			int nextOrder = rows.stream().mapToInt(ScheduledExercise::getOrderIndex).max().orElse(0) + 1;
			for (EditDayRequest.ExerciseTargetRequest t : add) {
				// Buổi đã có bài này thì bỏ qua: set_logs khoá theo (buổi, bài, số set).
				if (present.add(t.exerciseId())) {
					scheduledExercises.save(new ScheduledExercise(workout.getId(), t.exerciseId(), (short) nextOrder++,
							t.targetSets().shortValue(), t.targetReps().shortValue(), t.targetRepsMax().shortValue(),
							t.targetLoadKg(), null));
				}
			}
		}
		return open.size();
	}

	/**
	 * Dời buổi mở sang các thứ mới, giữ thứ tự (doc/design-chuong-trinh-v1.md §4.2). Chỉ chương
	 * trình mẫu: lịch tự thiết kế gắn bài theo thứ, dời sang thứ khác thì nhãn "T3" nằm vào thứ tư.
	 */
	@Transactional
	public int changeTrainingDays(UUID userId, List<Integer> days) {
		Set<DayOfWeek> training = EnumSet.noneOf(DayOfWeek.class);
		for (Integer day : days) {
			if (day == null || day < 1 || day > 7 || !training.add(DayOfWeek.of(day))) {
				throw badRequest("Ngày tập không hợp lệ");
			}
		}
		if (training.isEmpty()) {
			throw badRequest("Chọn ít nhất một ngày tập");
		}
		Program program = activeProgramOrThrow(userId);
		if (program.getTemplateId() == null) {
			throw new ResponseStatusException(
					HttpStatus.CONFLICT, "Lịch tự thiết kế gắn bài theo thứ, không đổi ngày được");
		}

		List<ScheduledWorkout> all = scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.getId());
		List<ScheduledWorkout> open = openWorkouts(userId, program);
		Set<UUID> openIds = open.stream().map(ScheduledWorkout::getId).collect(Collectors.toSet());
		Set<LocalDate> taken = all.stream().filter(w -> !openIds.contains(w.getId()))
				.map(ScheduledWorkout::getScheduledOn).collect(Collectors.toSet());

		LocalDate today = LocalDate.now();
		LocalDate cursor = program.getStartDate().isAfter(today) ? program.getStartDate() : today;
		List<LocalDate> newDates = new ArrayList<>();
		for (int i = 0; i < open.size(); i++) {
			while (!training.contains(cursor.getDayOfWeek()) || taken.contains(cursor)) {
				cursor = cursor.plusDays(1);
			}
			newDates.add(cursor);
			cursor = cursor.plusDays(1);
		}

		// UNIQUE (program_id, scheduled_on) không deferrable: đổi chỗ trực tiếp có lúc hai buổi
		// cùng ngày. Pha 1 dời hết sang dãy ngày tạm sau mọi ngày cũ và mới, pha 2 gán ngày thật.
		if (!open.isEmpty()) {
			LocalDate latest = all.get(all.size() - 1).getScheduledOn();
			LocalDate parking = (newDates.get(newDates.size() - 1).isAfter(latest)
					? newDates.get(newDates.size() - 1) : latest).plusDays(1);
			for (int i = 0; i < open.size(); i++) {
				open.get(i).reschedule(parking.plusDays(i), (short) open.get(i).getWeekIndex());
			}
			scheduledWorkouts.saveAllAndFlush(open);
			for (int i = 0; i < open.size(); i++) {
				LocalDate date = newDates.get(i);
				open.get(i).reschedule(date,
						(short) (ChronoUnit.DAYS.between(program.getStartDate(), date) / 7 + 1));
			}
			scheduledWorkouts.saveAllAndFlush(open);
		}

		program.changeRestDays(Arrays.stream(DayOfWeek.values())
				.filter(d -> !training.contains(d))
				.map(d -> (short) d.getValue())
				.toArray(Short[]::new));
		programs.save(program);
		return open.size();
	}

	private List<ScheduledWorkout> openWorkouts(UUID userId, Program program) {
		LocalDate today = LocalDate.now();
		return scheduledWorkouts.findByProgramIdOrderByScheduledOn(program.getId()).stream()
				.filter(w -> "PLANNED".equals(w.getStatus()) && !w.getScheduledOn().isBefore(today))
				.filter(w -> !sessions.existsByUserIdAndScheduledWorkoutIdAndStatus(userId, w.getId(), "IN_PROGRESS"))
				.toList();
	}

	private Program activeProgramOrThrow(UUID userId) {
		return programs.findByUserIdAndStatus(userId, "ACTIVE")
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có chương trình đang chạy"));
	}

	private static <T> List<T> orEmpty(List<T> list) {
		return list == null ? List.of() : list;
	}

	private static ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
