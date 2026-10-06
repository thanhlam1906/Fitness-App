package com.fitness.content.service;

import java.text.Normalizer;
import java.util.Locale;

/** Admin không gõ slug nữa: sinh từ tên. Bỏ dấu tiếng Việt vì slug nằm trong URL và log. */
final class TemplateSlugs {

	private TemplateSlugs() {
	}

	static String fromName(String name) {
		// "đ" không tách dấu qua NFD nên đổi tay trước.
		String plain = Normalizer.normalize(name.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
				.replaceAll("\\p{M}", "");
		String slug = plain.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
		return slug.isEmpty() ? "template" : slug;
	}
}
