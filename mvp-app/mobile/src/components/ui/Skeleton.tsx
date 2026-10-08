import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/**
 * Khối xám có vệt sáng lướt, giữ chỗ cho nội dung đang tải — bản mobile của
 * web/src/components/ui/skeleton.tsx. Đặt kích thước bằng className.
 * Vệt sáng là một dải gradient SVG chạy ngang: NativeWind không có background-position để làm như web.
 */
export function Skeleton({ className }: { className?: string }) {
  const [width, setWidth] = useState(0)
  const x = useSharedValue(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || width === 0) return
    x.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1)
  }, [reduced, width, x])

  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: (x.value * 2 - 1) * width }] }))

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={cn("overflow-hidden rounded-[10px] bg-surface-2", className)}
    >
      {!reduced && width > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, shine]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0.2" stopColor={colors.border} stopOpacity={0} />
                <Stop offset="0.5" stopColor={colors.border} stopOpacity={1} />
                <Stop offset="0.8" stopColor={colors.border} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#shine)" />
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}
