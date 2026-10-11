import { useEffect, useMemo, useState } from "react"
import { Upload } from "lucide-react"
import { cn } from "@/lib/cn"
import type { ExerciseImageKind } from "@/lib/exerciseImage"
import type { ImageDraft } from "@/features/exercise/types"
import { IMAGE_ACCEPT, imageFileError } from "@/features/admin/utils/imageFile"

const TEXT: Record<ExerciseImageKind, { title: string; formats: string; use: string }> = {
  still: {
    title: "Ảnh tĩnh",
    formats: "JPG, PNG, WebP · tối đa 5 MB",
    use: "Ô nhỏ trong buổi tập. Khung chi tiết cũng dùng ảnh này nếu bài không có ảnh động.",
  },
  animated: {
    title: "Ảnh động",
    formats: "GIF, WebP · tối đa 5 MB · không bắt buộc",
    use: "Chỉ hiện ở khung chi tiết bài.",
  },
}

const FOCUS = "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-accent)]"
const BUTTON = "inline-flex h-8 cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-3 text-[13px]"

/**
 * Một ô ảnh của form "Thông tin bài" (mockup doc/mockup-anh-bai-tap). Chỉ giữ bản nháp; gửi lên khi
 * bấm Lưu ở trang (doc/design-anh-bai-tap-v1.md §2).
 */
export function ImageSlot({
  kind,
  savedUrl,
  draft,
  onDraft,
}: {
  kind: ExerciseImageKind
  savedUrl: string | null
  draft: ImageDraft
  onDraft: (draft: ImageDraft) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const preview = useMemo(() => (draft instanceof File ? URL.createObjectURL(draft) : null), [draft])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  const shown = draft === "remove" ? null : (preview ?? savedUrl)
  const text = TEXT[kind]

  function pick(file: File | undefined) {
    if (!file) return
    const problem = imageFileError(kind, file)
    setError(problem)
    if (!problem) onDraft(file)
  }

  const fileInput = (
    <input
      type="file"
      accept={IMAGE_ACCEPT[kind]}
      className="sr-only"
      onChange={(e) => {
        pick(e.target.files?.[0])
        e.target.value = "" // chọn lại đúng file vừa bỏ vẫn phải gọi onChange
      }}
    />
  )

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3.5">
      <div className="flex items-baseline gap-2">
        <b className="text-sm">{text.title}</b>
        <small className="text-[11px] text-[var(--color-text-muted)]">{text.formats}</small>
        {kind === "still" && !shown && (
          <span className="ml-auto rounded-full bg-[var(--color-warn-tint)] px-2 py-0.5 text-[11px] text-[var(--color-warn)]">
            Chưa có
          </span>
        )}
      </div>
      <p className="text-xs leading-snug text-[var(--color-text-muted)]">{text.use}</p>

      {shown ? (
        <>
          <div className="relative grid h-[170px] place-items-center overflow-hidden rounded-[var(--radius-md)] bg-white">
            <img src={shown} alt={`Xem trước ${text.title.toLowerCase()}`} className="max-h-full max-w-full object-contain" />
            {draft instanceof File && (
              <span className="absolute top-2 left-2 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-accent-fg)]">
                Chưa lưu
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <label className={cn(BUTTON, "bg-[var(--color-surface-2)]", FOCUS)}>
              Thay ảnh
              {fileInput}
            </label>
            <button
              type="button"
              onClick={() => onDraft(savedUrl ? "remove" : null)}
              className={cn(BUTTON, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]")}
            >
              Xoá
            </button>
          </div>
        </>
      ) : draft === "remove" ? (
        <>
          <div className="grid h-[170px] place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 text-center text-[13px] text-[var(--color-text-muted)]">
            Ảnh sẽ bị xoá khi bấm Lưu.
          </div>
          <div>
            <button
              type="button"
              onClick={() => onDraft(null)}
              className={cn(BUTTON, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]")}
            >
              Giữ lại ảnh cũ
            </button>
          </div>
        </>
      ) : (
        <label
          className={cn(
            "flex h-[170px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[var(--color-border)] px-3 text-center text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            FOCUS,
          )}
        >
          <Upload className="size-6" aria-hidden />
          <span>Chọn ảnh</span>
          <small className="text-[11px]">{kind === "still" ? "JPG, PNG, WebP" : "GIF, WebP"}</small>
          {fileInput}
        </label>
      )}

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}
