import { Text, type TextProps } from "react-native"

/** Mọi số kg, rep, RPE dùng chữ số cùng bề rộng (concept-frontend §3.4) — cột số không nhảy. */
export function Num({ style, ...props }: TextProps & { className?: string }) {
  return <Text {...props} style={[{ fontVariant: ["tabular-nums"] }, style]} />
}
