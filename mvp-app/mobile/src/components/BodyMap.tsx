import { Pressable, Text, View } from "react-native"
import Svg, { Ellipse, G, Path, Rect, Text as SvgText } from "react-native-svg"
import { BODY_AREAS } from "@/features/workout/types"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

const VIEW_W = 200
const VIEW_H = 330

/**
 * Vùng bắt chạm nhỏ nhất, tính bằng đơn vị viewBox: 38 đơn vị ≈ 46pt ở bề rộng 240. Hình vẽ cổ tay
 * hay khuỷu tay nhỏ hơn thế nhiều — vùng bắt chạm phải phình ra khỏi hình, không thì trượt tay suốt.
 */
const MIN_HIT = 38

type Spot = { cx: number; cy: number; rx: number; ry: number; labelled?: boolean }

/**
 * Toạ độ trong khung 200×330 — chép từ web/src/components/BodyMap.tsx. TRÁI/PHẢI TÍNH THEO NGƯỜI
 * TRONG HÌNH (quy ước y tế), nên "Vai trái" nằm ở nửa BÊN PHẢI màn hình. Làm ngược là báo đau sai
 * bên, mà báo đau là tín hiệu ưu tiên cao nhất của engine điều chỉnh tải.
 */
const SPOTS: Record<string, Spot[] | undefined> = {
  SHOULDER_R: [{ cx: 68, cy: 75, rx: 15, ry: 13 }],
  SHOULDER_L: [{ cx: 132, cy: 75, rx: 15, ry: 13 }],
  UPPER_BACK: [{ cx: 100, cy: 113, rx: 27, ry: 18, labelled: true }],
  LOWER_BACK: [{ cx: 100, cy: 152, rx: 25, ry: 16, labelled: true }],
  HIP: [{ cx: 100, cy: 191, rx: 28, ry: 14, labelled: true }],
  // BODY_AREAS không chia trái/phải cho khuỷu và cổ tay: bấm tay nào cũng ra cùng một vùng.
  ELBOW: [
    { cx: 44, cy: 140, rx: 11, ry: 12 },
    { cx: 156, cy: 140, rx: 11, ry: 12 },
  ],
  WRIST: [
    { cx: 28, cy: 196, rx: 10, ry: 10 },
    { cx: 172, cy: 196, rx: 10, ry: 10 },
  ],
  KNEE_R: [{ cx: 78, cy: 252, rx: 13, ry: 14 }],
  KNEE_L: [{ cx: 122, cy: 252, rx: 13, ry: 14 }],
}

const HOTSPOTS = BODY_AREAS.flatMap((area) =>
  (SPOTS[area.value] ?? []).map((spot, i) => ({ id: `${area.value}-${i}`, area, spot })),
)

/** Nút bấm nằm đè lên SVG nên toạ độ quy ra %, cùng một nguồn số với hình. */
function hitStyle({ cx, cy, rx, ry }: Spot) {
  const w = Math.max(rx * 2, MIN_HIT)
  const h = Math.max(ry * 2, MIN_HIT)
  return {
    left: `${((cx - w / 2) / VIEW_W) * 100}%`,
    top: `${((cy - h / 2) / VIEW_H) * 100}%`,
    width: `${(w / VIEW_W) * 100}%`,
    height: `${(h / VIEW_H) * 100}%`,
  } as const
}

/**
 * Sơ đồ cơ thể nhìn từ trước cho bộ chọn vùng đau (màn kết buổi). Hình vẽ ẩn với trình đọc màn
 * hình; phần bấm được là các nút đè lên trên, mỗi nút có tên vùng. Chỉ báo "vừa bấm vùng nào",
 * việc bấm lại để bỏ chọn do màn gọi quyết định.
 */
export function BodyMap({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  const selected = BODY_AREAS.find((area) => area.value === value)
  const ink = colors.text

  return (
    <View>
      <View className="relative mx-auto w-[240px] max-w-full" style={{ aspectRatio: VIEW_W / VIEW_H }}>
        <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" accessibilityElementsHidden>
          <G fill={ink} stroke={ink} opacity={0.2}>
            <Ellipse cx={100} cy={31} rx={16} ry={19} />
            <Rect x={92} y={44} width={16} height={20} rx={6} />
            <Path d="M100 58C122 58 136 66 138 80C139 104 130 128 127 150C126 168 130 184 130 198L70 198C70 184 74 168 73 150C70 128 61 104 62 80C64 66 78 58 100 58Z" />
            {/* Tay chân là nét dày bo đầu — đủ ra hình người mà không phải vẽ đường bao. */}
            <G fill="none" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M68 78L44 140L26 206" strokeWidth={16} />
              <Path d="M132 78L156 140L174 206" strokeWidth={16} />
              <Path d="M84 186L78 252L74 306" strokeWidth={24} />
              <Path d="M116 186L122 252L126 306" strokeWidth={24} />
            </G>
            <Ellipse cx={71} cy={312} rx={13} ry={8} />
            <Ellipse cx={129} cy={312} rx={13} ry={8} />
          </G>

          {/* Vùng chưa chọn vẫn hiện mờ, để người dùng thấy chỗ nào chạm được. */}
          {HOTSPOTS.map(({ id, area, spot }) => {
            const on = value === area.value
            return (
              <Ellipse
                key={id}
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
                fill={on ? colors["danger-tint"] : ink}
                fillOpacity={on ? 1 : 0.12}
                stroke={on ? colors.danger : "none"}
                strokeWidth={2}
              />
            )
          })}

          {HOTSPOTS.filter(({ spot }) => spot.labelled).map(({ id, area, spot }) => (
            <SvgText
              key={id}
              x={spot.cx}
              y={spot.cy + 3.5}
              textAnchor="middle"
              fontSize={10}
              fill={value === area.value ? colors.danger : ink}
              fillOpacity={value === area.value ? 1 : 0.7}
            >
              {area.label}
            </SvgText>
          ))}
        </Svg>

        {HOTSPOTS.map(({ id, area, spot }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={area.label}
            accessibilityState={{ selected: value === area.value }}
            onPress={() => onChange(area.value)}
            style={hitStyle(spot)}
            className="absolute rounded-full"
          />
        ))}
      </View>

      {/* Màu thôi thì phải đoán — nói thẳng tên vùng đang chọn bằng chữ. */}
      <Text className="mt-2 text-center text-[13px] text-text-muted">
        {selected ? (
          <>
            Đang chọn <Text className="font-semibold text-danger">{selected.label} ✓</Text>
          </>
        ) : (
          "Chạm vào chỗ đau trên hình"
        )}
      </Text>

      {/* Vùng không nằm trên cơ thể (Chỗ khác) thành nút riêng dưới sơ đồ. */}
      <View className="mt-3 flex-row justify-center">
        {BODY_AREAS.filter((area) => !SPOTS[area.value]).map((area) => {
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
