import { BackLink } from "@/components/BackLink"
import { ScheduleBuilder } from "@/features/schedule/components/ScheduleBuilder"
import { useOpenFirstWorkout } from "@/features/schedule/api/useSchedule"

/**
 * "Tự thiết kế lịch" — mở từ Lịch › Sửa lịch (doc/design-ui-m3-v1.md §3). Sửa MỘT
 * buổi không còn ở đây mà ở thẻ ngày của màn Lịch ("Sửa buổi này").
 */
export function MySchedulePage() {
  const openFirstWorkout = useOpenFirstWorkout()
  return (
    <div>
      <BackLink to="/schedule">Lịch</BackLink>
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Tự thiết kế lịch</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">Tuần nào cũng lặp lại y hệt.</p>
      <div className="mt-5">
        <ScheduleBuilder onCreated={openFirstWorkout} />
      </div>
    </div>
  )
}
