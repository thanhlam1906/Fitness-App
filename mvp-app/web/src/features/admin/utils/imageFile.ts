import type { ExerciseImageKind } from "@/lib/exerciseImage"

/** Trùng ExerciseImageService của backend (doc/design-anh-bai-tap-v1.md §4). Backend vẫn kiểm lại bằng byte đầu file. */
const ACCEPTED: Record<ExerciseImageKind, string[]> = {
  still: ["image/jpeg", "image/png", "image/webp"],
  animated: ["image/gif", "image/webp"],
}

const REJECTED: Record<ExerciseImageKind, string> = {
  still: "Ảnh tĩnh chỉ nhận JPG, PNG hoặc WebP.",
  animated: "Ảnh động chỉ nhận GIF hoặc WebP.",
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** Giá trị `accept` của ô chọn file. */
export const IMAGE_ACCEPT: Record<ExerciseImageKind, string> = {
  still: ACCEPTED.still.join(","),
  animated: ACCEPTED.animated.join(","),
}

/** Báo ngay khi chọn, khỏi chờ bấm Lưu mới biết file không nhận. */
export function imageFileError(kind: ExerciseImageKind, file: { type: string; size: number }): string | null {
  if (!ACCEPTED[kind].includes(file.type)) return REJECTED[kind]
  if (file.size > MAX_IMAGE_BYTES) return "Ảnh lớn hơn 5 MB."
  return null
}
