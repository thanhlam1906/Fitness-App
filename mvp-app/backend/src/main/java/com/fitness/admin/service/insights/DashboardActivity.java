package com.fitness.admin.service.insights;

import com.fitness.admin.dto.AdminDashboardResponse.FormCheckStatResponse;
import com.fitness.admin.dto.AdminDashboardResponse.TimelinePointResponse;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Phần hoạt động của trang Tổng quan: top bài chấm form, góp ý bị báo sai và câu hỏi trợ lý theo thời
 * gian. Hàm thuần, không DB. Đầu vào đã gom theo ngày giờ VN ở SQL; ở đây chỉ gom ngày vào điểm.
 * doc/design-tong-quan-v2-v1.md §3.
 */
public final class DashboardActivity {

	static final int TOP = 5;

	/** source = FORM, LOAD hoặc ASSISTANT: góp ý gắn vào kết quả chấm form, quyết định tải hay câu trả lời trợ lý. */
	public record FeedbackDay(LocalDate day, String source, long count) {
	}

	/** Một người trong một ngày: cần userId để đếm số người khác nhau trong cả tuần. */
	public record QuestionDay(LocalDate day, UUID userId, long count) {
	}

	public record FormCheckCount(UUID exerciseId, String name, long checks, long users) {
	}

	public record Result(
			int formCheckTotal, List<FormCheckStatResponse> topFormChecks,
			String timelineUnit, List<TimelinePointResponse> timeline, int assistantAskers) {
	}

	private DashboardActivity() {
	}

	/**
	 * Khoảng = `days` ngày lịch kết thúc hôm nay. 90 ngày gom theo tuần (13 điểm, điểm cuối là tuần đang
	 * chạy, 6 ngày) cho đường đỡ dày; 7 và 30 ngày mỗi điểm một ngày. Điểm không có dữ liệu vẫn có, bằng 0.
	 */
	public static Result compute(
			LocalDate today, int days, List<FormCheckCount> formChecks,
			List<FeedbackDay> feedback, List<QuestionDay> questions) {
		int step = days == 90 ? 7 : 1;
		int size = (days + step - 1) / step;
		LocalDate first = today.minusDays(days - 1L);

		int[][] wrong = new int[size][3];
		for (FeedbackDay f : feedback) {
			int i = index(first, f.day(), step, size);
			if (i >= 0) {
				wrong[i][source(f.source())] += (int) f.count();
			}
		}

		int[] asked = new int[size];
		List<Set<UUID>> askers = new ArrayList<>();
		for (int i = 0; i < size; i++) {
			askers.add(new HashSet<>());
		}
		Set<UUID> allAskers = new HashSet<>();
		for (QuestionDay q : questions) {
			int i = index(first, q.day(), step, size);
			if (i >= 0) {
				asked[i] += (int) q.count();
				askers.get(i).add(q.userId());
				allAskers.add(q.userId());
			}
		}

		List<TimelinePointResponse> timeline = new ArrayList<>();
		for (int i = 0; i < size; i++) {
			timeline.add(new TimelinePointResponse(first.plusDays((long) i * step),
					wrong[i][0], wrong[i][1], wrong[i][2], asked[i], askers.get(i).size()));
		}

		List<FormCheckStatResponse> top = formChecks.stream()
				.sorted(Comparator.comparingLong(FormCheckCount::checks).reversed()
						.thenComparing(FormCheckCount::name))
				.limit(TOP)
				.map(c -> new FormCheckStatResponse(c.exerciseId(), c.name(), (int) c.checks(), (int) c.users()))
				.toList();
		int total = (int) formChecks.stream().mapToLong(FormCheckCount::checks).sum();

		return new Result(total, top, step == 7 ? "WEEK" : "DAY", timeline, allAskers.size());
	}

	/** -1 khi ngày nằm ngoài khoảng: SQL lọc theo mốc giờ, nên ngày biên vẫn có thể lọt vào. */
	private static int index(LocalDate first, LocalDate day, int step, int size) {
		long d = ChronoUnit.DAYS.between(first, day);
		if (d < 0) {
			return -1;
		}
		long i = d / step;
		return i < size ? (int) i : -1;
	}

	private static int source(String source) {
		return switch (source) {
			case "FORM" -> 0;
			case "LOAD" -> 1;
			default -> 2;
		};
	}
}
