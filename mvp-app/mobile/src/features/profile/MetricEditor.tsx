import { useState } from "react"
import { Text, View } from "react-native"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"

/**
 * Ô nhập một số + nút Lưu — màn Hồ sơ và Lịch sử cân nặng (web để trong ProfilePage.tsx). Khoảng
 * hợp lệ giống backend (@Valid BodyMetricRequest), ngoài khoảng thì khoá nút Lưu.
 */
export function MetricEditor({
  unit,
  decimal,
  min,
  max,
  initial,
  pending,
  onSave,
}: {
  unit: string
  decimal?: boolean
  min?: number
  max?: number
  initial: number | null | undefined
  pending: boolean
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState(initial?.toString().replace(".", ",") ?? "")
  // Bàn phím số iOS tiếng Việt gõ dấu phẩy thập phân: Number() cần dấu chấm.
  const parsed = Number(value.replace(",", "."))
  const valid =
    value !== "" && !Number.isNaN(parsed) && (min == null || parsed >= min) && (max == null || parsed <= max)

  return (
    <View className="flex-row items-center gap-2.5">
      <Input
        accessibilityLabel={unit}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        className="w-32"
        style={{ fontVariant: ["tabular-nums"] }}
        value={value}
        onChangeText={setValue}
      />
      <Text className="text-sm text-text-muted">{unit}</Text>
      <Button size="sm" disabled={!valid || pending} onPress={() => onSave(parsed)}>
        {pending ? "Đang lưu…" : "Lưu"}
      </Button>
    </View>
  )
}
