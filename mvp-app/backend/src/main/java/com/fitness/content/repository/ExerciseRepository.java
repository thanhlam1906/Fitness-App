package com.fitness.content.repository;

import com.fitness.content.entity.Exercise;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

	List<Exercise> findBySlugIn(List<String> slugs);

	Optional<Exercise> findBySlug(String slug);

	/**
	 * Tra bài cho trợ lý: bài đang bật và bài chưa duyệt, KHÔNG bài đã xoá (design-thu-vien-bai-v1 §4.2).
	 * Khớp đúng tên đi đường riêng (so chuỗi) vì pg_trgm có thể không tách được chữ có dấu, nên độ gần của
	 * tên Việt không đáng tin; khớp đúng xếp trước, rồi độ gần giảm dần, rồi tên ngắn trước.
	 * COALESCE(..., false) ở ORDER BY: bài mới nạp không có tên Việt, name_vi NULL làm biểu thức khớp thành
	 * NULL, mà DESC xếp NULL lên đầu — bài khớp đúng bị đẩy xuống sau các bài chỉ gần tên. (Không đổi name_vi
	 * thành '' để tránh NULL: tên rỗng sẽ khớp đúng mọi bài chưa có tên Việt.)
	 */
	@Query(value = """
			SELECT * FROM exercises
			WHERE (is_active OR is_draft)
			  AND (lower(name_en) = lower(:name) OR lower(name_vi) = lower(:name)
			       OR GREATEST(similarity(name_en, :name), similarity(COALESCE(name_vi, ''), :name)) >= :minScore)
			ORDER BY (lower(name_en) = lower(:name) OR COALESCE(lower(name_vi) = lower(:name), false)) DESC,
			         GREATEST(similarity(name_en, :name), similarity(COALESCE(name_vi, ''), :name)) DESC,
			         length(name_en)
			LIMIT :limit
			""", nativeQuery = true)
	List<Exercise> searchByName(@Param("name") String name, @Param("minScore") double minScore, @Param("limit") int limit);
}
