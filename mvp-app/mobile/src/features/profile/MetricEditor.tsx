import { useState } from "react"
import { Text, View } from "react-native"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { cleanDecimal, parseDecimal } from "~/lib/number"

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
  const parsed = parseDecimal(value)
  const valid = !Number.isNaN(parsed) && (min == null || parsed >= min) && (max == null || parsed <= max)

  return (
    <View className="flex-row items-center gap-2.5">
      <Input
        accessibilityLabel={unit}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        className="w-32"
        style={{ fontVariant: ["tabular-nums"] }}
        value={value}
        onChangeText={(t) => setValue(decimal ? cleanDecimal(t) : t.replace(/\D/g, ""))}
      />
      <Text className="text-sm text-text-muted">{unit}</Text>
      <Button size="sm" disabled={!valid || pending} onPress={() => onSave(parsed)}>
        {pending ? "Đang lưu…" : "Lưu"}
      </Button>
    </View>
  )
}
