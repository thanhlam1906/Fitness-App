import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router"
import { IconText, Notice } from "@/components/StatusViews"
import { useForm } from "react-hook-form"
import { AdminHeader } from "@/features/admin/components/AdminShell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"
import { ExerciseListPanel } from "@/features/admin/components/ExerciseListPanel"
import { FilmingGuideFields } from "@/features/admin/components/FilmingGuideFields"
import { FormCheckEditor } from "@/features/admin/components/FormCheckEditor"
import { HelpButton, HelpText, useHelp } from "@/features/admin/components/HelpButton"
import { ImageSlot } from "@/features/admin/components/ImageSlot"
import { formToGuide, guideToForm, type ExerciseFormValues } from "@/features/admin/utils/filmingGuideForm"
import { useExercise, useSaveExercise, useSaveExerciseImages } from "@/features/exercise/api/useExercises"
import type { ImageDraft, ImageDrafts } from "@/features/exercise/types"
import { exerciseImageUrl } from "@/lib/exerciseImage"

type Tab = "checks" | "info"

const NO_DRAFTS: ImageDrafts = { still: null, animated: null }

/**
 * Màn 12 concept-frontend-v1.md — "màn HLV dùng nhiều nhất". slug bất biến sau
 * khi tạo, không sửa được ở form edit.
 *
 * Design chia màn làm hai cột (danh sách bài | trình sửa) và trình sửa có tab.
 * Tab mặc định là "Cách chấm form" vì vòng lặp chỉnh ngưỡng mới là việc HLV làm
 * hằng ngày; thông tin bài sửa một lần rồi thôi.
 *
 * Hai tab "Lịch sử sửa" và "Clip mẫu", cùng cột "Đối chiếu clip mẫu" bên phải
 * trong design, chưa dựng: không có endpoint nào trả lịch sử sửa, clip mẫu hay
 * kết quả chấm lại.
 */
export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === "new"
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const existing = useExercise(isNew ? "" : id!)
  const save = useSaveExercise(isNew ? undefined : id)
  const help = useHelp()
  const images = useSaveExerciseImages()
  const location = useLocation()
  // Upload ảnh mất vài giây mà cột danh sách bên trái vẫn bấm được: callback lưu xong chạy khi admin đã sang bài khác.
  // Callback đóng quanh `id` lúc bấm Lưu nên cần ref để biết trang đang mở bài nào. Cập nhật ở layout effect, không
  // ghi ref lúc render, để ngay sau khi bài mới lên màn hình ref đã đúng.
  const currentId = useRef(id)
  useLayoutEffect(() => {
    currentId.current = id
  }, [id])
  // Hai mutation thuộc cả trang chứ không thuộc từng bài: đổi bài mà không reset thì bài mới hiện nhầm "Đã lưu",
  // lỗi ảnh, hay nút "Đang lưu…" bị khoá của bài trước. Riêng trang bài vừa tạo xong (save.data.id === id) giữ lại:
  // đó là kết quả của chính lần lưu này, "Đã lưu" và lý do ảnh lỗi vẫn phải hiện. Chỉ đổi theo `id` nên không đưa
  // save, images vào deps.
  useEffect(() => {
    if (save.data?.id === id) return
    save.reset()
    images.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi đổi bài; save, images đổi theo trạng thái lưu, đưa vào deps thì vừa lưu xong đã bị reset
  }, [id])
  // Bấm sang bài khác trong cột trái chỉ đổi :id, component vẫn là một. Đổi bài (kể cả quay lại bài cũ, hay từ
  // "new" sang bài vừa tạo) thì bắt đầu sạch: chữ của bài được nạp lại từ server, ảnh nháp cũng phải bỏ.
  const [draftState, setDraftState] = useState<{ id: string | undefined; drafts: ImageDrafts }>({
    id,
    drafts: NO_DRAFTS,
  })
  if (draftState.id !== id) setDraftState({ id, drafts: NO_DRAFTS })
  const drafts = draftState.id === id ? draftState.drafts : NO_DRAFTS
  const setDraft = (kind: keyof ImageDrafts, draft: ImageDraft) =>
    setDraftState({ id, drafts: { ...drafts, [kind]: draft } })
  const clearDrafts = () => setDraftState({ id, drafts: NO_DRAFTS })
  // Tạo bài xong mà ảnh lỗi: trang này mở lại ở bài vừa tạo, kèm cờ trong state điều hướng.
  const imageFailedOnCreate = (location.state as { imageFailed?: boolean } | null)?.imageFailed === true

  const tab: Tab = isNew ? "info" : searchParams.get("tab") === "info" ? "info" : "checks"

  const { register, handleSubmit, reset } = useForm<ExerciseFormValues>({
    // Bài mới: ô hướng dẫn quay phải có chuỗi rỗng sẵn, không thì formToGuide gặp undefined.
    defaultValues: { guide: guideToForm(null) },
    values: existing.data
      ? {
          slug: existing.data.slug,
          nameEn: existing.data.nameEn,
          nameVi: existing.data.nameVi ?? "",
          muscleGroupsText: existing.data.muscleGroups.join(", "),
          equipmentText: existing.data.equipment.join(", "),
          muscleGroups: existing.data.muscleGroups,
          equipment: existing.data.equipment,
          description: existing.data.description ?? "",
          filmingGuide: existing.data.filmingGuide ?? "",
          guide: guideToForm(existing.data.filmingGuide),
          active: existing.data.active,
        }
      : undefined,
  })

  function onSubmit(values: ExerciseFormValues) {
    const { muscleGroupsText, equipmentText, guide, ...rest } = values
    const toList = (s: string) =>
      s
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    const hasDrafts = drafts.still !== null || drafts.animated !== null
    const startedOn = id
    // Admin đã sang bài khác thì kết quả lưu này không được đụng tới trang đang mở: clearDrafts sẽ xoá nháp ảnh và
    // reset() trả form về giá trị server của bài đó, mất chữ vừa gõ; navigate kéo admin quay lại bài cũ.
    const isStale = () => currentId.current !== startedOn
    const done = (result: { id: string }) => {
      if (isStale()) return
      clearDrafts()
      if (isNew) navigate(`/admin/exercises/${result.id}`, { replace: true })
      else reset()
    }
    save.mutate(
      { ...rest, filmingGuide: formToGuide(guide), muscleGroups: toList(muscleGroupsText), equipment: toList(equipmentText) },
      {
        onSuccess: (result) => {
          if (!hasDrafts) return done(result)
          images.mutate(
            { id: result.id, drafts },
            {
              onSuccess: () => done(result),
              // Bài đã tạo: mở trang sửa bài đó để bấm Lưu lần nữa là SỬA, không tạo bài trùng.
              onError: () => {
                if (isStale()) return
                if (isNew) navigate(`/admin/exercises/${result.id}?tab=info`, { replace: true, state: { imageFailed: true } })
              },
            },
          )
        },
      },
    )
  }

  // oxlint-disable-next-line react/refs -- onSubmit chỉ đọc ref lúc submit, không phải lúc render
  const submit = handleSubmit(onSubmit)

  // ?v=updatedAt: trình duyệt giữ ảnh cùng URL trong trang, thay ảnh xong phải thấy ảnh mới ngay.
  const savedImageUrl = (kind: "still" | "animated") => {
    const ex = existing.data
    if (isNew || !ex) return null
    const has = kind === "still" ? ex.hasStillImage : ex.hasAnimatedImage
    return has ? exerciseImageUrl(ex.slug, kind, ex.updatedAt) : null
  }

  const title = isNew
    ? "Bài tập mới"
    : existing.isError
      ? "Không tải được bài"
      : (existing.data?.nameVi ?? existing.data?.nameEn ?? <Skeleton className="h-6 w-56" />)

  return (
    <div className="flex min-h-0 flex-1">
      <ExerciseListPanel activeId={isNew ? undefined : id} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Bài tập và ngưỡng" title={title}>
          {/* Phần ảnh của lần lưu chưa xong hoặc hỏng thì chưa được nói "đã lưu". */}
          {save.isSuccess && !images.isPending && !images.isError && (
            <span className="text-xs whitespace-nowrap text-[var(--color-text-muted)]">
              Đã lưu — không cần tải lại
            </span>
          )}
        </AdminHeader>

        {!isNew && (
          <div className="flex gap-5 border-b border-[var(--color-border)] px-6 text-sm">
            <TabButton
              active={tab === "checks"}
              onClick={() => setSearchParams({ tab: "checks" })}
            >
              Cách chấm form
            </TabButton>
            <TabButton active={tab === "info"} onClick={() => setSearchParams({ tab: "info" })}>
              Thông tin bài
            </TabButton>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {/* Tab "Cách chấm form" tự có khung tải trong FormCheckEditor. */}
          {!isNew && tab === "info" && existing.isLoading && (
            // Khung của form "Thông tin bài": cặp tên, cặp nhóm cơ/thiết bị, mô tả, hướng dẫn quay.
            <div role="status" aria-label="Đang tải" className="max-w-3xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-[62px]" />
                <Skeleton className="h-[62px]" />
                <Skeleton className="h-[62px]" />
                <Skeleton className="h-[62px]" />
              </div>
              <Skeleton className="h-[86px]" />
              <Skeleton className="h-[130px]" />
              <Skeleton className="h-8 w-40" />
            </div>
          )}
          {!isNew && existing.isError && (
            <IconText>{existing.error.message}</IconText>
          )}

          {/* key={id}: đổi bài thì dựng lại trình sửa để bản nháp của bài trước không lưu nhầm sang bài này. */}
          {tab === "checks" && !isNew && id && <FormCheckEditor key={id} exerciseId={id} />}

          {/* Form trống hiện song song với khung chờ thì vẫn bấm Lưu được: chờ có dữ liệu mới hiện. */}
          {tab === "info" && (isNew || existing.data) && (
            <form onSubmit={submit} className="max-w-3xl space-y-4">
              {imageFailedOnCreate && !images.isSuccess && (
                <Notice icon={TriangleAlert} tone="danger">
                  Bài đã được tạo nhưng ảnh chưa tải lên được. Chọn lại ảnh rồi bấm Lưu.
                </Notice>
              )}
              {isNew && (
                <div className="space-y-1.5">
                  <Label htmlFor="slug">slug</Label>
                  <Input id="slug" placeholder="goblet-squat" {...register("slug")} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nameEn">Tên (EN)</Label>
                  <Input id="nameEn" {...register("nameEn")} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center">
                    <Label htmlFor="nameVi">Tên (VI)</Label>
                    <HelpButton open={help.isOpen("name")} onClick={() => help.toggle("name")} />
                  </div>
                  <Input id="nameVi" {...register("nameVi")} />
                  {help.isOpen("name") && <HelpText id="name" />}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="muscleGroupsText">Nhóm cơ (phẩy)</Label>
                  <Input
                    id="muscleGroupsText"
                    placeholder="QUADS, GLUTES"
                    {...register("muscleGroupsText")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="equipmentText">Thiết bị (phẩy, rỗng = bodyweight)</Label>
                  <Input
                    id="equipmentText"
                    placeholder="BARBELL_RACK"
                    {...register("equipmentText")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea id="description" rows={2} {...register("description")} />
              </div>
              <section className="space-y-3 border-t border-[var(--color-border)] pt-4.5">
                <div>
                  <h2 className="text-[15px] font-bold">Ảnh minh hoạ</h2>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Người tập thấy ảnh ở ô nhỏ cạnh tên bài trong buổi tập, và ở khung lớn khi bấm xem chi tiết bài.
                  </p>
                </div>
                {/* key theo id: báo lỗi chọn file của bài trước không theo sang bài khác. */}
                <div className="grid grid-cols-2 gap-3">
                  <ImageSlot
                    key={`still-${id}`}
                    kind="still"
                    savedUrl={savedImageUrl("still")}
                    draft={drafts.still}
                    onDraft={(d) => setDraft("still", d)}
                  />
                  <ImageSlot
                    key={`animated-${id}`}
                    kind="animated"
                    savedUrl={savedImageUrl("animated")}
                    draft={drafts.animated}
                    onDraft={(d) => setDraft("animated", d)}
                  />
                </div>
              </section>
              <FilmingGuideFields register={register} checkViews={existing.data?.checkViews ?? []} />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox {...register("active")} /> Đang hoạt động
                </label>
              </div>

              {save.isError && (
                <IconText>{save.error.message}</IconText>
              )}
              {images.isError && <IconText>Ảnh chưa lưu được: {images.error.message}</IconText>}

              <div className="flex gap-2.5">
                <Button type="submit" size="sm" disabled={save.isPending || images.isPending}>
                  {save.isPending || images.isPending ? "Đang lưu…" : isNew ? "Tạo bài" : "Lưu thay đổi"}
                </Button>
                {!isNew && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      reset()
                      clearDrafts()
                    }}
                  >
                    Hoàn tác
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 py-3",
        active
          ? "border-[var(--color-accent)] font-bold text-[var(--color-text)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  )
}
