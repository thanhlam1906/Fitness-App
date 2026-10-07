package com.fitness;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Chuẩn cấu trúc doc/design-chuan-cau-truc-v1.md §7.1. Đọc thẳng mã nguồn thay vì ArchUnit để khỏi
 * thêm thư viện; chuẩn chỉ ghi trong tài liệu thì sớm muộn bị làm lệch, như logic từng lọt vào controller.
 */
class ArchitectureTest {

	private static final Path ROOT = Path.of("src/main/java/com/fitness");
	private static final Set<String> LAYERS = Set.of("controller", "service", "repository", "entity", "dto");
	// save\w*: gồm cả saveAll, saveAndFlush, saveAllAndFlush.
	private static final String WRITE = "\\.(save\\w*|delete\\w*)\\(";

	@Test
	void codeTheoChuanCauTruc() throws IOException {
		// Set: tên field gặp cả ở khai báo lẫn constructor, một lỗi chỉ báo một lần.
		Set<String> violations = new LinkedHashSet<>();
		try (Stream<Path> files = Files.walk(ROOT)) {
			for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
				check(ROOT.relativize(file).toString().replace('\\', '/'), stripComments(Files.readString(file)), violations);
			}
		}
		assertThat(violations).as("Lệch chuẩn cấu trúc").isEmpty();
	}

	private static void check(String path, String code, Set<String> out) {
		String[] parts = path.split("/");
		// Chỉ FitnessApplication được nằm ở gốc; lớp khác ở gốc rơi xuống luật "ngoài 5 thư mục tầng".
		if (path.equals("FitnessApplication.java") || parts[0].equals("config") || parts[0].equals("common")) {
			return;
		}
		String feature = parts[0];
		String layer = parts.length >= 3 ? parts[1] : "";
		if (!LAYERS.contains(layer)) {
			out.add(path + ": nằm ngoài 5 thư mục tầng");
			return;
		}
		if (layer.equals("controller")) {
			if (Pattern.compile("import com\\.fitness\\.\\w+\\.(repository|entity)\\.").matcher(code).find()) {
				out.add(path + ": controller import repository hoặc entity");
			}
			if (code.contains("@Transactional")) {
				out.add(path + ": controller có @Transactional");
			}
			if (Pattern.compile("public [\\w<>, ?]*\\w+Service\\.\\w+").matcher(code).find()) {
				out.add(path + ": controller trả kiểu khai báo trong service");
			}
		}
		if (layer.equals("service") && code.contains("CurrentUser") && !path.endsWith("/AssistantTools.java")) {
			out.add(path + ": service đọc CurrentUser, phải nhận userId qua tham số");
		}
		if (layer.equals("dto")) {
			Matcher record = Pattern.compile("\\brecord (\\w+)").matcher(code);
			while (record.find()) {
				if (!record.group(1).endsWith("Request") && !record.group(1).endsWith("Response")) {
					out.add(path + ": record " + record.group(1) + " thiếu hậu tố Request/Response");
				}
			}
		}
		// Ghi vào bảng của feature khác phải qua service của feature đó (spec §4.4).
		Matcher repo = Pattern.compile("import com\\.fitness\\.(\\w+)\\.repository\\.(\\w+);").matcher(code);
		while (repo.find()) {
			if (repo.group(1).equals(feature)) {
				continue;
			}
			Matcher field = Pattern.compile("\\b" + repo.group(2) + " (\\w+)[;,)]").matcher(code);
			while (field.find()) {
				if (Pattern.compile("\\b" + field.group(1) + WRITE).matcher(code).find()) {
					out.add(path + ": ghi vào " + repo.group(2) + " của feature " + repo.group(1));
				}
			}
		}
	}

	private static String stripComments(String src) {
		return src.replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("//[^\\n]*", "");
	}
}
