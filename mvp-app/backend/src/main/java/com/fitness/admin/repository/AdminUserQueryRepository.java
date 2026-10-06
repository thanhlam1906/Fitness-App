package com.fitness.admin.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Danh sách người dùng màn admin (doc/design-quan-ly-user-v1.md §5.2–5.3). Một native query với
 * CTE gộp buổi tập, clip, chương trình đang chạy và lịch — lọc, sắp xếp, phân trang trong
 * Postgres thay vì tải hết rồi lọc trong RAM như bản thử nghiệm.
 *
 * Câu WHERE/ORDER BY ghép bằng chuỗi nhưng chỉ từ hằng trong lớp này (SORT_COLUMNS, các mảnh
 * điều kiện cố định); giá trị người dùng nhập luôn đi qua tham số có tên.
 */
@Repository
public class AdminUserQueryRepository {

	public record Filter(String q, String status, String role, UUID id) {

		public static Filter byId(UUID id) {
			return new Filter("", "ALL", "ALL", id);
		}
	}

	public record UserRow(
			UUID id, String email, String fullName, String role, boolean active, String status,
			Instant createdAt, Instant lastActivityAt, String programName, Short weekIndex, Short totalWeeks,
			long sessionCount, long clipCount, Integer adherencePct) {
	}

	public record OverviewCounts(
			long trainees, long newTrainees, long activeTrainees, long notStarted, long traineeSessions) {
	}

	public static final Map<String, String> SORT_COLUMNS = Map.of(
			"createdAt", "created_at",
			"lastActivityAt", "last_at",
			"email", "email",
			"sessionCount", "session_count");

	// "Đang tập" = có buổi trong 7 ngày; mốc truyền từ Java để mọi query trong một request dùng cùng một mốc.
	private static final String BASE = """
			WITH s AS (
			    SELECT user_id, max(started_at) AS last_at, count(*) AS n
			    FROM workout_sessions GROUP BY user_id),
			c AS (
			    SELECT user_id, count(*) AS n FROM video_review_requests GROUP BY user_id),
			prog AS (
			    SELECT DISTINCT ON (p.user_id) p.user_id, p.id AS program_id,
			           CASE WHEN p.template_id IS NULL THEN 'Lịch tự thiết kế' ELSE t.name END AS program_name
			    FROM programs p LEFT JOIN program_templates t ON t.id = p.template_id
			    WHERE p.status = 'ACTIVE'
			    ORDER BY p.user_id, p.created_at DESC),
			sw AS (
			    SELECT program_id, count(*) AS total,
			           count(*) FILTER (WHERE status = 'DONE') AS done,
			           max(week_index) AS total_weeks,
			           min(week_index) FILTER (WHERE status = 'PLANNED') AS current_week
			    FROM scheduled_workouts GROUP BY program_id),
			base AS (
			    SELECT u.id, u.email::text AS email, u.role, u.is_active, u.created_at, pr.full_name,
			           s.last_at, coalesce(s.n, 0) AS session_count, coalesce(c.n, 0) AS clip_count,
			           prog.program_name, sw.current_week, sw.total_weeks,
			           CASE WHEN sw.total > 0 THEN round(sw.done * 100.0 / sw.total)::int END AS adherence_pct,
			           CASE WHEN NOT u.is_active THEN 'LOCKED'
			                WHEN s.last_at IS NULL THEN 'NOT_STARTED'
			                WHEN s.last_at >= :since THEN 'TRAINING'
			                ELSE 'IDLE' END AS status
			    FROM users u
			    LEFT JOIN profiles pr ON pr.user_id = u.id
			    LEFT JOIN s ON s.user_id = u.id
			    LEFT JOIN c ON c.user_id = u.id
			    LEFT JOIN prog ON prog.user_id = u.id
			    LEFT JOIN sw ON sw.program_id = prog.program_id)
			""";

	private final NamedParameterJdbcTemplate jdbc;

	public AdminUserQueryRepository(NamedParameterJdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<UserRow> find(Filter filter, String sort, boolean asc, Integer limit, Integer offset) {
		MapSqlParameterSource params = params();
		StringBuilder sql = new StringBuilder(BASE).append("SELECT * FROM base").append(where(filter, params))
				.append(" ORDER BY ").append(SORT_COLUMNS.get(sort)).append(asc ? " ASC" : " DESC")
				.append(" NULLS LAST, id");
		if (limit != null) {
			sql.append(" LIMIT :limit OFFSET :offset");
			params.addValue("limit", limit).addValue("offset", offset);
		}
		return jdbc.query(sql.toString(), params, AdminUserQueryRepository::mapRow);
	}

	public long count(Filter filter) {
		MapSqlParameterSource params = params();
		Long n = jdbc.queryForObject(BASE + "SELECT count(*) FROM base" + where(filter, params), params, Long.class);
		return n == null ? 0 : n;
	}

	/** Số trên các tab trạng thái — mọi tài khoản, kể cả admin. */
	public Map<String, Long> statusCounts() {
		Map<String, Long> counts = new HashMap<>(Map.of("TRAINING", 0L, "NOT_STARTED", 0L, "IDLE", 0L, "LOCKED", 0L));
		jdbc.query(BASE + "SELECT status, count(*) AS n FROM base GROUP BY status", params(),
				rs -> {
					counts.put(rs.getString("status"), rs.getLong("n"));
				});
		counts.put("ALL", counts.values().stream().mapToLong(Long::longValue).sum());
		return counts;
	}

	/** Bốn ô thống kê — chỉ người tập (role USER), admin không phải người dùng của sản phẩm. */
	public OverviewCounts overview() {
		MapSqlParameterSource params = params();
		return jdbc.queryForObject(BASE + """
				SELECT count(*) FILTER (WHERE role = 'USER') AS trainees,
				       count(*) FILTER (WHERE role = 'USER' AND created_at >= :since) AS new_trainees,
				       count(*) FILTER (WHERE role = 'USER' AND status = 'TRAINING') AS active_trainees,
				       count(*) FILTER (WHERE role = 'USER' AND status = 'NOT_STARTED') AS not_started,
				       (SELECT count(*) FROM workout_sessions ws JOIN users u ON u.id = ws.user_id
				        WHERE u.role = 'USER' AND ws.started_at >= :since) AS trainee_sessions
				FROM base
				""", params, (rs, i) -> new OverviewCounts(
						rs.getLong("trainees"), rs.getLong("new_trainees"), rs.getLong("active_trainees"),
						rs.getLong("not_started"), rs.getLong("trainee_sessions")));
	}

	private static MapSqlParameterSource params() {
		return new MapSqlParameterSource("since", Timestamp.from(Instant.now().minus(7, ChronoUnit.DAYS)));
	}

	private static String where(Filter filter, MapSqlParameterSource params) {
		StringBuilder w = new StringBuilder(" WHERE true");
		if (filter.q() != null && !filter.q().isBlank()) {
			// % và _ người dùng gõ là chữ thường, không phải ký tự đại diện.
			String escaped = filter.q().strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
			params.addValue("like", "%" + escaped + "%");
			w.append(" AND (email ILIKE :like ESCAPE '\\' OR full_name ILIKE :like ESCAPE '\\')");
		}
		if (!"ALL".equals(filter.status())) {
			params.addValue("status", filter.status());
			w.append(" AND status = :status");
		}
		if (!"ALL".equals(filter.role())) {
			params.addValue("role", filter.role());
			w.append(" AND role = :role");
		}
		if (filter.id() != null) {
			params.addValue("id", filter.id());
			w.append(" AND id = :id");
		}
		return w.toString();
	}

	private static UserRow mapRow(ResultSet rs, int rowNum) throws SQLException {
		Timestamp lastAt = rs.getTimestamp("last_at");
		Integer currentWeek = rs.getObject("current_week", Integer.class);
		Integer totalWeeks = rs.getObject("total_weeks", Integer.class);
		return new UserRow(
				rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("full_name"),
				rs.getString("role"), rs.getBoolean("is_active"), rs.getString("status"),
				rs.getTimestamp("created_at").toInstant(), lastAt == null ? null : lastAt.toInstant(),
				rs.getString("program_name"),
				currentWeek == null ? null : currentWeek.shortValue(),
				totalWeeks == null ? null : totalWeeks.shortValue(),
				rs.getLong("session_count"), rs.getLong("clip_count"),
				rs.getObject("adherence_pct", Integer.class));
	}
}
