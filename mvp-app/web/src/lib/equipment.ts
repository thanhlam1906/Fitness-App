/**
 * Mã dụng cụ của một bài tập (cột equipment trong bảng exercises), theo thứ tự hiện trên nút chọn.
 * Trùng ContentCodes.EQUIPMENT ở backend. Khác EQUIPMENT_OPTIONS của hồ sơ (features/profile/types):
 * hồ sơ chỉ hỏi 4 loại người tập có ở nhà, còn bài tập cần thêm máy cáp, máy tập, dây... nên 4 mã
 * đầu giữ đúng thứ tự và nhãn của hồ sơ, 5 mã sau là của riêng bài tập.
 *
 * File thuần (không React, không import từ features): mobile lấy lại qua alias `@/`.
 */
export const EXERCISE_EQUIPMENT_OPTIONS = [
  { value: "BARBELL_RACK", label: "Tạ đòn + giá đỡ" },
  { value: "DUMBBELL", label: "Tạ đơn" },
  { value: "KETTLEBELL", label: "Tạ ấm" },
  { value: "BENCH", label: "Ghế" },
  { value: "CABLE", label: "Máy cáp" },
  { value: "MACHINE", label: "Máy tập" },
  { value: "BAND", label: "Dây kháng lực" },
  { value: "BALL", label: "Bóng tập" },
  { value: "OTHER", label: "Dụng cụ khác" },
] as const

/** Mã → chữ hiện cho người dùng. */
export const EQUIPMENT_VI: Record<string, string> = Object.fromEntries(
  EXERCISE_EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]),
)
