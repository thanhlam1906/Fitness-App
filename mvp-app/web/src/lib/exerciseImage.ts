export type ExerciseImageKind = "still" | "animated"

/**
 * Ảnh bài tập do backend phát (doc/design-anh-bai-tap-v1.md §4). Công khai vì thẻ <img> không gửi được token.
 * Mobile import qua `@/lib/exerciseImage`. `version` chỉ admin dùng: trình duyệt giữ ảnh cùng URL trong trang,
 * thêm `?v=` thì thay ảnh xong thấy ngay.
 */
export function exerciseImageUrl(slug: string, kind: ExerciseImageKind, version?: string): string {
  const url = `/api/v1/exercise-images/${encodeURIComponent(slug)}/${kind}`
  return version ? `${url}?v=${encodeURIComponent(version)}` : url
}
