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
	 *
	 * "Khớp đúng" = bỏ hoa thường, khoảng trắng và - _ . , / ( ) ' ở cả hai phía ("push up" khớp "Push-up").
	 * Biểu thức regexp_replace dưới đây PHẢI cùng nghĩa với AssistantTools.normalizeName (Java): SQL xếp bài
	 * khớp đúng lên đầu, Java dùng nó để giữ lại đúng bài đó. Không dùng [:alnum:] hay \W: collation của DB
	 * có thể không coi chữ Việt có dấu là chữ cái. Cũng không viết [[:space:]]: Hibernate đọc ":space" như
	 * một tham số có tên.
	 * COALESCE(..., false): bài mới nạp không có name_vi (NULL) làm cờ khớp thành NULL, mà ORDER BY DESC xếp
	 * NULL lên đầu, đẩy bài khớp đúng xuống sau các bài chỉ gần tên.
	 */
	@Query(value = """
			SELECT * FROM (
			    SELECT e.*,
			           (regexp_replace(lower(e.name_en), '[\\s_.,/()''-]', '', 'g')
			                = regexp_replace(lower(:name), '[\\s_.,/()''-]', '', 'g')
			            OR COALESCE(regexp_replace(lower(e.name_vi), '[\\s_.,/()''-]', '', 'g')
			                = regexp_replace(lower(:name), '[\\s_.,/()''-]', '', 'g'), false)) AS is_exact,
			           GREATEST(similarity(e.name_en, :name), similarity(COALESCE(e.name_vi, ''), :name)) AS score
			    FROM exercises e
			    WHERE e.is_active OR e.is_draft
			) t
			WHERE t.is_exact OR t.score >= :minScore
			ORDER BY t.is_exact DESC, t.score DESC, length(t.name_en)
			LIMIT :limit
			""", nativeQuery = true)
	List<Exercise> searchByName(@Param("name") String name, @Param("minScore") double minScore, @Param("limit") int limit);
}
