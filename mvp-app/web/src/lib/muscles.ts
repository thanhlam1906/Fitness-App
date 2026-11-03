/**
 * Mã nhóm cơ trong bảng exercises (muscle_groups), theo thứ tự hiện trên nút chọn. Trùng
 * ContentCodes.MUSCLES ở backend — server chặn mã ngoài danh sách này. Phần tử đầu của
 * muscle_groups là cơ chính.
 */
export const MUSCLE_OPTIONS = [
  { value: "QUADS", label: "Đùi trước" },
  { value: "HAMSTRINGS", label: "Đùi sau" },
  { value: "GLUTES", label: "Mông" },
  { value: "CORE", label: "Bụng" },
  { value: "LOWER_BACK", label: "Lưng dưới" },
  { value: "UPPER_BACK", label: "Lưng trên" },
  { value: "LATS", label: "Xô" },
  { value: "CHEST", label: "Ngực" },
  { value: "SHOULDERS", label: "Vai" },
  { value: "TRICEPS", label: "Tay sau" },
  { value: "BICEPS", label: "Tay trước" },
  { value: "CALVES", label: "Bắp chân" },
  { value: "FOREARMS", label: "Cẳng tay" },
  { value: "ADDUCTORS", label: "Đùi trong" },
  { value: "ABDUCTORS", label: "Đùi ngoài" },
  { value: "CARDIO", label: "Tim mạch" },
] as const

/** Mã → chữ hiện cho người dùng. */
export const MUSCLE_VI: Record<string, string> = Object.fromEntries(MUSCLE_OPTIONS.map((m) => [m.value, m.label]))
