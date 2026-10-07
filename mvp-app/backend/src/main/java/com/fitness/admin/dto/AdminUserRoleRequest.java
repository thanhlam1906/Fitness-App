package com.fitness.admin.dto;

import com.fitness.auth.entity.Role;
import jakarta.validation.constraints.NotNull;

public record AdminUserRoleRequest(@NotNull Role role) {
}
