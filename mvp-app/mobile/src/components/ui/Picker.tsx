import { Fragment, useRef, useState } from "react"
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native"
import { ChevronDown } from "lucide-react-native"
import { indexAtScroll, nearestIndex } from "@/lib/wheel"
import { cn } from "@/lib/cn"
import { Sheet, SheetHeader } from "~/components/ui/Sheet"
import { colors } from "~/theme"

// Chiều cao một ô trong cột. Cột cao 220 = 5 ô, dải chọn nằm ở ô giữa (88px) — như web.
const ITEM = 44
const PAD = 88

/**
 * Ô trông như input; bấm vào mới mở khung chọn trượt từ đáy lên, kiểu bộ chọn ngày trên điện
 * thoại (doc/design-ui-m2-v1.md). "Xong" mới ghi giá trị, "Huỷ" hay chạm nền tối thì giữ nguyên.
 * `formatValue` cho cột không phải số trần (vd ngày bắt đầu "Hôm nay", "T5 03/10").
 */
export function PickerField({
  title,
  columns,
  columnLabels,
  value,
  start,
  display,
  unit,
  separator,
  formatValue,
  onChange,
}: {
  title: string
  columns: number[][]
  columnLabels?: string[]
  /** null = ô chưa chọn. */
  value: number[] | null
  /** Cột mở ở đâu khi ô còn trống. Chỉ là chỗ bắt đầu cuộn, không tự ghi vào ô. */
  start: number[]
  /** Chữ hiện trong ô khi đã có giá trị. */
  display: string | null
  unit?: string
  separator?: string
  formatValue?: (v: number) => string
  onChange: (value: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<number[]>(start)

  function openSheet() {
    setDraft(value ?? start)
    setOpen(true)
  }

  function done() {
    onChange(draft)
    setOpen(false)
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${display ?? "chưa chọn"}`}
        onPress={openSheet}
        className="h-12 w-full flex-row items-center justify-between rounded-md border border-border bg-surface pl-3.5 pr-3"
      >
        <Text
          className={cn("text-[15px]", display ? "font-semibold text-text" : "text-text-muted")}
          style={display ? { fontVariant: ["tabular-nums"] } : undefined}
        >
          {display ?? "Chọn"}
        </Text>
        <ChevronDown size={18} color={colors["text-muted"]} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} label={title} className="pb-4">
        <SheetHeader title={title} confirmLabel="Xong" onCancel={() => setOpen(false)} onConfirm={done} />
        <View className="relative mx-4 h-[220px] flex-row overflow-hidden rounded-lg bg-bg">
          <View
            pointerEvents="none"
            className="absolute inset-x-1.5 h-11 rounded-md border border-border bg-surface-2"
            style={{ top: PAD }}
          />
          {columns.map((values, i) => (
            <Fragment key={i}>
              {i > 0 && separator && (
                <View className="w-3 items-center justify-center">
                  <Text className="text-[22px] font-extrabold text-text">{separator}</Text>
                </View>
              )}
              <WheelColumn
                label={columnLabels?.[i] ?? title}
                values={values}
                value={draft[i]}
                formatValue={formatValue}
                onChange={(v) => setDraft((d) => d.map((x, j) => (j === i ? v : x)))}
              />
            </Fragment>
          ))}
          {unit && (
            <Text pointerEvents="none" className="absolute right-4 text-[13px] text-text-muted" style={{ top: 101 }}>
              {unit}
            </Text>
          )}
        </View>
      </Sheet>
    </>
  )
}

/** Một cột cuộn. `snapToInterval` dừng đúng ô; chỉ đọc ô nào đang ở giữa dải chọn. */
function WheelColumn({
  label,
  values,
  value,
  formatValue,
  onChange,
}: {
  label: string
  values: number[]
  value: number
  formatValue?: (v: number) => string
  onChange: (value: number) => void
}) {
  const ref = useRef<ScrollView>(null)
  const index = nearestIndex(values, value)
  // Chỉ lúc dựng: về sau vị trí cuộn là nguồn sự thật, không kéo ngược theo state.
  const initialY = useRef(index * ITEM)

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = indexAtScroll(e.nativeEvent.contentOffset.y, ITEM, values.length)
    if (values[i] !== value) onChange(values[i])
  }

  return (
    <ScrollView
      ref={ref}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: formatValue ? formatValue(values[index]) : String(values[index]) }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => {
        const step = e.nativeEvent.actionName === "increment" ? 1 : -1
        const next = Math.min(values.length - 1, Math.max(0, index + step))
        ref.current?.scrollTo({ y: next * ITEM, animated: false })
        onChange(values[next])
      }}
      className="flex-1"
      contentOffset={{ x: 0, y: initialY.current }}
      contentContainerStyle={{ paddingVertical: PAD }}
      snapToInterval={ITEM}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={onScroll}
    >
      {values.map((v, i) => (
        <Pressable
          key={v}
          onPress={() => ref.current?.scrollTo({ y: i * ITEM, animated: true })}
          className="h-11 items-center justify-center"
        >
          <Text
            className={i === index ? "text-[22px] font-extrabold text-text" : "text-lg text-text-muted"}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatValue ? formatValue(v) : v}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
