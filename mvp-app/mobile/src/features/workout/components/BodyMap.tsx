import { useEffect, useState } from "react"
import { AccessibilityInfo, Pressable, Text, View } from "react-native"
import Svg, { G, Path } from "react-native-svg"
import { BODY_AREAS } from "@/features/workout/types"
import { BODY_VIEWS } from "@/features/workout/utils/bodyMap"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/**
 * Đường viền vô hình quanh mỗi vùng, đơn vị viewBox (khung rộng 727) — cùng số với web: gối hay hông
 * chỉ to cỡ đầu ngón tay, vùng bắt chạm phải phình ra khỏi hình, không thì trượt tay suốt.
 */
const HIT_STROKE = 60

/**
 * Hình người mặt trước và mặt sau cho bộ chọn vùng đau (màn kết buổi) — chuyển từ
 * web/src/features/workout/components/BodyMap.tsx, cùng hai lớp: lớp dưới bắt chạm phình ra, lớp
 * trên là hình thật bấm trúng chính xác. Khác web: không có focus bàn phím. Chỉ báo "vừa bấm vùng
 * nào", việc bấm lại để bỏ chọn do màn gọi quyết định.
 */
export function BodyMap({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  const selected = BODY_AREAS.find((area) => area.value === value)
  const onMap = new Set(BODY_VIEWS.flatMap((view) => view.areas.map((a) => a.area.value as string)))
  const ink = colors.text
  const reader = useScreenReader()

  return (
    <View>
      {/* react-native-svg bỏ role, state của G, và VoiceOver bấm vào giữa khung nhóm — vùng có hai
          bên (khuỷu, cổ tay, hông) rơi vào giữa thân. Nên ẩn hình khỏi VoiceOver, thay bằng nút chữ. */}
      <View
        className="mx-auto w-full max-w-[360px] flex-row gap-4"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {BODY_VIEWS.map((view) => {
          const [, , w, h] = view.vb.split(" ").map(Number)
          return (
            <View key={view.key} className="flex-1">
              <View style={{ aspectRatio: w / h }}>
                <Svg viewBox={view.vb} width="100%" height="100%">
                  {view.areas.map(({ area, paths }) => (
                    <G
                      key={area.value}
                      onPress={() => onChange(area.value)}
                      fill="transparent"
                      stroke="transparent"
                      strokeWidth={HIT_STROKE}
                      strokeLinejoin="round"
                    >
                      {paths.map((d, i) => (
                        <Path key={i} d={d} />
                      ))}
                    </G>
                  ))}

                  {/* Theo thứ tự vẽ của hình gốc để mảng chồng nhau (háng trên đùi trong) không bị đè. */}
                  <G strokeWidth={5}>
                    {view.shapes.map(({ d, area }, i) => {
                      const on = value === area
                      return (
                        <Path
                          key={i}
                          d={d}
                          onPress={() => onChange(area)}
                          fill={on ? colors.danger : ink}
                          fillOpacity={on ? 0.55 : 0.34}
                          stroke={on ? colors.danger : "none"}
                        />
                      )
                    })}
                  </G>
                </Svg>
              </View>
              <Text className="mt-1 text-center text-[11px] text-text-muted">{view.label}</Text>
            </View>
          )
        })}
      </View>

      {/* Màu thôi thì phải đoán — nói thẳng tên vùng đang chọn bằng chữ. */}
      <Text className="mt-2 text-center text-[13px] text-text-muted">
        {selected ? (
          <>
            Đang chọn <Text className="font-semibold text-danger">{selected.label} ✓</Text>
          </>
        ) : reader ? (
          "Chọn chỗ đau ở các nút bên dưới"
        ) : (
          "Chạm vào chỗ đau trên hình"
        )}
      </Text>

      {/* Vùng không nằm trên cơ thể (Chỗ khác) thành nút riêng dưới sơ đồ. Bật VoiceOver thì mọi
          vùng đều thành nút ở đây, vì hình đã ẩn khỏi VoiceOver. */}
      <View className="mt-3 flex-row flex-wrap justify-center gap-2">
        {BODY_AREAS.filter((area) => reader || !onMap.has(area.value)).map((area) => {
          const on = value === area.value
          return (
            <Pressable
              key={area.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(area.value)}
              className={cn("rounded-full px-3.5 py-2", on ? "border border-danger bg-danger-tint" : "bg-surface")}
            >
              <Text className={cn("text-[13px]", on ? "font-semibold text-danger" : "text-text-muted")}>
                {area.label}
                {on && " ✓"}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

/** VoiceOver đang bật không — đổi ngay khi người dùng bật, tắt giữa chừng. */
function useScreenReader() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setOn)
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setOn)
    return () => sub.remove()
  }, [])
  return on
}
