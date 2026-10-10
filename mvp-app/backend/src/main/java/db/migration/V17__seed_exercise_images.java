package db.migration;

import java.io.InputStream;
import java.sql.PreparedStatement;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

/**
 * Nạp ảnh 20 bài seed (trước nằm ở web/public/exercises) vào exercise_images, đúng MỘT lần.
 * Migration chứ không phải việc chạy lúc khởi động: admin xoá ảnh một bài cũ thì khởi động lại
 * không được nạp lại. Gói db.migration để Flyway tự quét theo `classpath:db/migration`.
 * Tên file: `<slug>.jpg` là ảnh tĩnh, `<slug>.gif` là ảnh động.
 */
public class V17__seed_exercise_images extends BaseJavaMigration {

	@Override
	public void migrate(Context context) throws Exception {
		Resource[] files = new PathMatchingResourcePatternResolver(getClass().getClassLoader())
				.getResources("classpath:exercise-images/*");
		try (PreparedStatement insert = context.getConnection().prepareStatement(
				"INSERT INTO exercise_images (slug, kind, content_type, bytes) VALUES (?, ?, ?, ?)")) {
			for (Resource file : files) {
				String name = file.getFilename();
				boolean gif = name.endsWith(".gif");
				insert.setString(1, name.substring(0, name.lastIndexOf('.')));
				insert.setString(2, gif ? "ANIMATED" : "STILL");
				insert.setString(3, gif ? "image/gif" : "image/jpeg");
				try (InputStream in = file.getInputStream()) {
					insert.setBytes(4, in.readAllBytes());
				}
				insert.addBatch();
			}
			insert.executeBatch();
		}
	}
}
