package com.fitness.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PublishRequest(
		@NotBlank(message = "Tên hiển thị không được trống.")
		@Size(max = 200, message = "Tên hiển thị tối đa 200 ký tự.") String title) {
}
