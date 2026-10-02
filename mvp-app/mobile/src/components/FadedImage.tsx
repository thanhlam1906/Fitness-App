import { Image, StyleSheet, View } from "react-native"
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg"
import { assetUrl } from "~/lib/config"
import { colors } from "~/theme"

/**
 * Ảnh phủ đầu màn rồi chìm dần vào màu nền (màn đăng nhập, onboarding). RN không có
 * linear-gradient CSS như web nên lớp chìm vẽ bằng SVG: `[đỉnh, giữa]` là độ đục của màu nền
 * ở đỉnh và ở mốc `mid`, đáy luôn đục hẳn để chữ bên dưới đọc được.
 */
export function FadedImage({
  path,
  height,
  top,
  mid,
  midAt,
}: {
  path: string
  height: number
  top: number
  mid: number
  midAt: number
}) {
  return (
    <View className="absolute inset-x-0 top-0" style={{ height }} pointerEvents="none">
      <Image source={{ uri: assetUrl(path) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={top} />
            <Stop offset={midAt} stopColor={colors.bg} stopOpacity={mid} />
            <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  )
}
