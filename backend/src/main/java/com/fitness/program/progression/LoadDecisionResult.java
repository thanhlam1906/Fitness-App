package com.fitness.program.progression;

import java.util.Map;

/**
 * Ánh xạ trực tiếp vào bảng load_decisions. ruleId + ruleParams là lý do CẤU
 * TRÚC (debug, và để trợ lý RAG sau này giải thích được — ke-hoach-ky-thuat
 * §12.1). messageVi là chuỗi hiển thị ngay trên màn lịch tuần.
 */
public record LoadDecisionResult(
		Direction direction,
		Double deltaKg,
		String ruleId,
		Map<String, Object> ruleParams,
		String messageVi) {
}
