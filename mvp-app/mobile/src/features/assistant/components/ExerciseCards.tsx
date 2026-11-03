import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated"
import { ChevronDown } from "lucide-react-native"
import type { ExerciseCard } from "@/features/assistant/types"
import { cn } from "@/lib/cn"
import { EQUIPMENT_VI } from "@/lib/equipment"
import { MUSCLE_VI } from "@/lib/muscles"
import { ExerciseGuideBody } from "~/components/ExerciseGuideBody"
import { ExerciseImage } from "~/components/ExerciseImage"
import { colors } from "~/theme"

const FRAME = "overflow-hidden rounded-lg border border-border bg-surface"

/**
 * Thẻ bài dưới câu trả lời của trợ lý — bản mobile của web/.../ExerciseCards.tsx (doc/design-thu-vien-bai-v1.md
 * §7.3). Một bài: thẻ đầy đủ. Hai, ba bài: hàng gọn, bấm mở thẻ. Nội dung lấy thẳng từ DB qua backend.
 * Nút "cái này sai" nằm dưới thẻ và áp cho cả tin nhắn, thẻ cũng vậy.
 */
export function ExerciseCards({ cards }: { cards?: ExerciseCard[] }) {
  if (!cards?.length) return null
  if (cards.length === 1) {
    const [c] = cards
    return (
      <View className={cn("mt-2.5", FRAME)}>
        <ExerciseGuideBody {...bodyProps(c)} title={c.nameEn} inCard />
      </View>
    )
  }
  return <ExerciseRows cards={cards} />
}

function ExerciseRows({ cards }: { cards: ExerciseCard[] }) {
  // Một lúc mở một hàng: thẻ dài, mở cả ba thì đẩy cuộc trò chuyện đi quá xa. Bài đầu mở sẵn.
  const [openSlug, setOpenSlug] = useState<string | null>(cards[0].slug)
  return (
    <View className="mt-2.5 gap-2">
      {cards.map((c) => {
        const open = c.slug === openSlug
        return (
          <View key={c.slug} className={FRAME}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenSlug(open ? null : c.slug)}
              className="flex-row items-center gap-2.5 py-2 pl-2 pr-3 active:bg-surface-2"
            >
              <ExerciseImage slug={c.slug} alt="" variant="thumb" inCard />
              <View className="flex-1">
                <Text numberOfLines={1} className="text-sm font-bold text-text">
                  {c.nameEn}
                </Text>
                <Text numberOfLines={1} className="text-xs text-text-muted">
                  {summary(c)}
                </Text>
              </View>
              <Chevron open={open} />
            </Pressable>
            {/* Chỉ dựng thân khi mở: không tải ảnh động của hàng đang đóng. Tên đã ở nút nên không truyền `title`. */}
            {open && (
              <View className="border-t border-border">
                <ExerciseGuideBody {...bodyProps(c)} inCard />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

/** Mũi tên xoay 180° khi mở, 150ms như web; bật giảm chuyển động thì lật ngay. */
function Chevron({ open }: { open: boolean }) {
  const deg = useSharedValue(open ? 180 : 0)
  const reduced = useReducedMotion()
  useEffect(() => {
    const to = open ? 180 : 0
    deg.value = reduced ? to : withTiming(to, { duration: 150 })
  }, [open, reduced, deg])
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${deg.value}deg` }] }))
  // Style thường thay vì className: NativeWind không gắn class cho Animated.View của reanimated.
  return (
    <Animated.View style={style}>
      <ChevronDown size={18} color={colors["text-muted"]} />
    </Animated.View>
  )
}

function bodyProps(c: ExerciseCard) {
  return {
    slug: c.slug,
    muscleGroups: c.muscleGroups,
    equipment: c.equipment,
    stepsVi: c.stepsVi,
    mistakesVi: c.mistakesVi,
  }
}

/** "Cơ chính · dụng cụ" của hàng gọn. Bài không cần dụng cụ ghi "Không cần" như trong thân thẻ. */
function summary(c: ExerciseCard): string {
  const main = c.muscleGroups[0]
  const equipment = c.equipment.length > 0 ? c.equipment.map((code) => EQUIPMENT_VI[code] ?? code).join(", ") : "Không cần"
  return [main && (MUSCLE_VI[main] ?? main), equipment].filter(Boolean).join(" · ")
}
