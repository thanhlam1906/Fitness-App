// TẠM (mốc 1, doc/ke-hoach-mobile-v1.md): màn thật chuyển ở task sau.
import { Text } from "react-native"
import { Screen } from "~/components/Screen"

export default function Placeholder() {
  return (
    <Screen>
      <Text className="text-2xl font-extrabold text-text">Chấm form</Text>
      <Text className="mt-2 text-sm text-text-muted">Đang chuyển sang mobile.</Text>
    </Screen>
  )
}
