/** Góp ý "cái này sai" gắn với đúng một thứ máy sinh ra: kết quả chấm form, quyết định tải hoặc câu trả lời trợ lý. */
export type FeedbackSource = { reviewResultId: string } | { loadDecisionId: string } | { assistantMessageId: string }
