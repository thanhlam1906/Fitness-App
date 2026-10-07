package com.fitness.admin.service;

import com.fitness.admin.repository.AdminUserQueryRepository.UserRow;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Xuất CSV danh sách người dùng (doc/design-quan-ly-user-v1.md §5.3). BOM để Excel đọc đúng tiếng
 * Việt; ô bắt đầu bằng = + - @ bị thêm dấu ' để Excel không chạy nó như công thức (CSV injection).
 */
final class UserCsv {

	private static final String HEADER = "ho_ten,email,vai_tro,trang_thai,tham_gia,hoat_dong_gan_nhat,"
			+ "chuong_trinh,tuan,buoi,clip,tuan_thu_pct";

	private UserCsv() {
	}

	static String write(List<UserRow> rows) {
		StringBuilder out = new StringBuilder("﻿").append(HEADER).append("\r\n");
		for (UserRow r : rows) {
			out.append(Stream.of(
					r.fullName(), r.email(), r.role(), r.status(), String.valueOf(r.createdAt()),
					r.lastActivityAt() == null ? null : r.lastActivityAt().toString(),
					r.programName(),
					r.weekIndex() == null ? null : r.weekIndex() + "/" + r.totalWeeks(),
					String.valueOf(r.sessionCount()), String.valueOf(r.clipCount()),
					r.adherencePct() == null ? null : r.adherencePct().toString())
					.map(UserCsv::cell).collect(Collectors.joining(","))).append("\r\n");
		}
		return out.toString();
	}

	private static String cell(String value) {
		if (value == null) {
			return "";
		}
		String v = value;
		if (!v.isEmpty() && "=+-@\t\r".indexOf(v.charAt(0)) >= 0) {
			v = "'" + v;
		}
		if (v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r")) {
			v = "\"" + v.replace("\"", "\"\"") + "\"";
		}
		return v;
	}
}
