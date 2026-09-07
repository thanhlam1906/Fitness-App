package com.fitness.workout;

import java.util.List;

/** §5.1 concept-frontend-v1.md — báo đau cuối buổi, chọn vùng và mức độ. Danh sách rỗng = không đau. */
public record FinishSessionRequest(List<PainReportRequest> painReports) {

	public record PainReportRequest(String bodyArea, short severity, String note) {
	}
}
