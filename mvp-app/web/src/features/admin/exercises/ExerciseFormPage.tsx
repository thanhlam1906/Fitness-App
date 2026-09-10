import { useNavigate, useParams, useSearchParams } from "react-router"
import { useForm } from "react-hook-form"
import { AdminHeader } from "@/components/AdminShell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/cn"
import { ExerciseListPanel } from "./ExerciseListPanel"
import { FormCheckEditor } from "./FormCheckEditor"
import type { ExerciseInput } from "./types"
import { useExercise, useSaveExercise } from "./useExercises"

type Tab = "checks" | "info"

/**
 * Màn 12 concept-frontend-v1.md — "màn HLV dùng nhiều nhất". slug bất biến sau
 * khi tạo, không sửa được ở form edit.
 *
 * Design chia màn làm hai cột (danh sách bài | trình sửa) và trình sửa có tab.
 * Tab mặc định là "Ngưỡng chấm" vì vòng lặp chỉnh ngưỡng mới là việc HLV làm
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

  const tab: Tab = isNew ? "info" : searchParams.get("tab") === "info" ? "info" : "checks"

  const { register, handleSubmit, reset } = useForm<
    ExerciseInput & { muscleGroupsText: string; equipmentText: string }
  >({
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
          analyzable: existing.data.analyzable,
          active: existing.data.active,
        }
      : undefined,
  })

  function onSubmit(values: ExerciseInput & { muscleGroupsText: string; equipmentText: string }) {
    const { muscleGroupsText, equipmentText, ...rest } = values
    const toList = (s: string) =>
      s
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    save.mutate(
      { ...rest, muscleGroups: toList(muscleGroupsText), equipment: toList(equipmentText) },
      {
        onSuccess: (result) => {
          if (isNew) navigate(`/admin/exercises/${result.id}`, { replace: true })
          else reset()
        },
      },
    )
  }

  const title = isNew
    ? "Bài tập mới"
    : (existing.data?.nameVi ?? existing.data?.nameEn ?? "Đang tải…")

  return (
    <div className="flex min-h-0 flex-1">
      <ExerciseListPanel activeId={isNew ? undefined : id} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader group="Bài tập và ngưỡng · form_checks" title={title}>
          {save.isSuccess && (
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
              Ngưỡng chấm
            </TabButton>
            <TabButton active={tab === "info"} onClick={() => setSearchParams({ tab: "info" })}>
              Thông tin bài
            </TabButton>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {!isNew && existing.isLoading && (
            <p className="text-sm text-[var(--color-text-muted)]">Đang tải…</p>
          )}

          {tab === "checks" && !isNew && id && <FormCheckEditor exerciseId={id} />}

          {tab === "info" && (
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-4">
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
                  <Label htmlFor="nameVi">Tên (VI)</Label>
                  <Input id="nameVi" {...register("nameVi")} />
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
              <div className="space-y-1.5">
                <Label htmlFor="filmingGuide">
                  Hướng dẫn quay — JSON, hiện ở màn gửi clip. Bỏ trống nếu chưa có
                </Label>
                <Textarea
                  id="filmingGuide"
                  rows={4}
                  placeholder='{"angles":[{"code":"SAGITTAL","label":"Ngang","why":"..."}],"distance":"...","lighting":"...","duration":"..."}'
                  {...register("filmingGuide")}
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox {...register("analyzable")} /> Chấm form được (TN2)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox {...register("active")} /> Đang hoạt động
                </label>
              </div>

              {save.isError && (
                <p className="text-sm text-[var(--color-danger)]">{save.error.message}</p>
              )}

              <div className="flex gap-2.5">
                <Button type="submit" size="sm" disabled={save.isPending}>
                  {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
                {!isNew && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => reset()}>
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
