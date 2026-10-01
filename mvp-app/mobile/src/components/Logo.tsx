import { Text, View } from "react-native"
import Svg, { Path, Rect } from "react-native-svg"
import { cn } from "@/lib/cn"
import { colors } from "~/theme"

/** Chữ V vẽ như dấu tích: vừa "Việt", vừa "form chuẩn" — hai thứ app hứa. */
export function Logo({ className }: { className?: string }) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <Svg viewBox="0 0 32 32" width={30} height={30}>
        <Rect width={32} height={32} rx={9} fill={colors.accent} />
        <Path
          d="M8.5 11 L14.2 22 L23.5 8.5"
          fill="none"
          stroke={colors["accent-fg"]}
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text className="text-[21px] font-extrabold tracking-[-0.4px] text-text">VFit</Text>
    </View>
  )
}
