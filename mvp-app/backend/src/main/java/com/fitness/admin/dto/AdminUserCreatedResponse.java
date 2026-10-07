package com.fitness.admin.dto;

/** Mật khẩu tạm chỉ trả đúng một lần ở đây; không lưu bản rõ, không ghi log, không vào nhật ký. */
public record AdminUserCreatedResponse(AdminUserRowResponse user, String temporaryPassword) {
}
