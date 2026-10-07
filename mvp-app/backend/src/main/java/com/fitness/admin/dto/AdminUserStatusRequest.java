package com.fitness.admin.dto;

import jakarta.validation.constraints.NotNull;

/** `reason` bắt buộc khi khoá (active=false) — kiểm ở service vì phụ thuộc `active`. */
public record AdminUserStatusRequest(@NotNull Boolean active, String reason) {
}
