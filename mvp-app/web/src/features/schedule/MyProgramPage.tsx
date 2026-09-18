import { useState } from "react"
import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { ScheduleBuilder } from "./ScheduleBuilder"
import { useSchedule } from "./useSchedule"
import { WorkoutEditor } from "./WorkoutEditor"

/**
 * Màn "Lịch riêng" — nơi người dùng tự thiết kế lịch và tự sửa buổi tập, khác
 * màn "Lịch tuần" chỉ để xem và bắt đầu buổi.
 */
export function MyProgramPage() {
  const schedule = useSchedule()
  const [building, setBuilding] = useState(false)

  if (schedule.isLoading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Đang tải lịch…</p>
  }

  const noProgram =
    schedule.isError && schedule.error instanceof ApiError && schedule.error.status === 404
  if (schedule.isError && !noProgram) {
    return (
      <p className="text-sm text-[var(--color-danger)]">
        Không tải được lịch: {schedule.error.message}
      </p>
    )
  }

  return (
    <div>
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">Lịch riêng</h1>

      {building || noProgram ? (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            Chọn thứ bạn tập, thêm bài và tự đặt set, rep, mức tạ.
          </p>
          <div className="mt-5">
            <ScheduleBuilder onCreated={() => setBuilding(false)} />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            Sửa bài tập, set, rep và mức tạ của từng buổi. Thay đổi chỉ áp cho buổi đó.
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setBuilding(true)}>
            Tạo lịch mới
          </Button>
          <div className="mt-5 space-y-3">
            {schedule.data!.workouts.map((workout) => (
              <WorkoutEditor key={workout.id} workout={workout} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
