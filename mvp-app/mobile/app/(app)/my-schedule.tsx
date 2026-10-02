import { Text, View } from "react-native"
import { BackLink } from "~/components/BackLink"
import { Screen } from "~/components/Screen"
import { ScheduleBuilder } from "~/features/schedule/ScheduleBuilder"
import { useOpenFirstWorkout } from "~/features/schedule/useSchedule"

/** "Tự thiết kế lịch" (doc/design-ui-m3-v1.md §3) — bản mobile của MyProgramPage web. */
export default function MyScheduleScreen() {
  const openFirstWorkout = useOpenFirstWorkout()
  return (
    <Screen>
      <BackLink label="Lịch" fallback="/schedule" />
      <Text className="mt-2 text-[28px] font-extrabold tracking-[-0.5px] text-text">Tự thiết kế lịch</Text>
      <Text className="mt-1.5 text-[13px] leading-5 text-text-muted">
        Chọn ngày tập trong tuần, thêm bài cho từng ngày. Tuần nào cũng lặp lại y hệt.
      </Text>
      <View className="mt-5">
        <ScheduleBuilder onCreated={openFirstWorkout} />
      </View>
    </Screen>
  )
}
