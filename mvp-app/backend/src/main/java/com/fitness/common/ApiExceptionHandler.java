package com.fitness.common;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * server.error.include-message=always nên lỗi Spring tự sinh lộ nguyên câu tiếng Anh ra màn người dùng,
 * vd gõ tay /form-check/bodyweight-squat thì id không phải UUID. Dùng sendError thay vì trả body riêng:
 * vẫn ra JSON lỗi chuẩn của Boot {status, error, message, path} mà web, mobile đang đọc, message lấy từ đây.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	// Exception này bắn cả cho query và field form (exerciseId gửi kèm clip), chỉ tham số trên path mới gọi là đường dẫn.
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public void handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletResponse response)
			throws IOException {
		boolean onPath = ex.getParameter().hasParameterAnnotation(PathVariable.class);
		response.sendError(HttpStatus.BAD_REQUEST.value(), onPath ? "Đường dẫn không hợp lệ." : "Yêu cầu không hợp lệ.");
	}
}
