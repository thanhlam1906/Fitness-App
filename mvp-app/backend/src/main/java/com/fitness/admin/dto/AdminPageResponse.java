package com.fitness.admin.dto;

import java.util.List;

/** Một trang kết quả; `page` đếm từ 0. Dùng cho danh sách người dùng và nhật ký quản trị. */
public record AdminPageResponse<T>(List<T> items, long total, int page, int size) {
}
