package com.fitness.admin.dto;

/** Lý do bắt buộc — kiểm ở service để báo lỗi tiếng Việt thay vì lỗi validate chung. */
public record AdminUserDeleteRequest(String reason) {
}
