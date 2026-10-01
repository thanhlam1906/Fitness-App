import { useState, type ReactNode } from "react"
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg"
import { Eye, EyeOff } from "lucide-react-native"
import { Controller, type Control, type FieldValues, type Path as FieldPath } from "react-hook-form"
import { cn } from "@/lib/cn"
import { Logo } from "~/components/Logo"
import { Input, type InputProps } from "~/components/ui/Input"
import { Label } from "~/components/ui/Label"
import { assetUrl } from "~/lib/config"
import { colors } from "~/theme"

const BG_HEIGHT = 620

/**
 * Khung chung màn đăng nhập, đăng ký (hướng B, doc/design-ui-m1-v1.md §2). Ảnh chỉ phủ phần đầu
 * rồi chìm vào màu nền: form đăng ký dài cuộn trên nền phẳng, chữ luôn đọc được. RN không có
 * linear-gradient CSS nên lớp chìm vẽ bằng SVG, cùng ba mốc 25% · 70% · 100% của web.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-bg">
      <View className="absolute inset-x-0 top-0" style={{ height: BG_HEIGHT }} pointerEvents="none">
        <Image source={{ uri: assetUrl("/auth/bg.jpg") }} className="absolute inset-0" resizeMode="cover" />
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bg} stopOpacity={0.25} />
              <Stop offset="0.55" stopColor={colors.bg} stopOpacity={0.7} />
              <Stop offset="1" stopColor={colors.bg} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </View>
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        contentContainerStyle={{ paddingTop: insets.top + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Logo className="px-1" />
        <Text className="mt-[120px] px-1 text-[30px] font-extrabold leading-[33px] tracking-[-0.75px] text-text">
          {title}
        </Text>
        <Text className="mt-1.5 px-1 text-sm text-text-muted">{subtitle}</Text>
        <View className="mt-5 rounded-lg border border-glass-border bg-glass p-4">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const PROVIDERS = [
  { name: "Google", Icon: GoogleIcon },
  { name: "Facebook", Icon: FacebookIcon },
]

/** Chưa nối OAuth (nối sau khi deploy). Bấm vẫn phản hồi để người dùng không tưởng app hỏng. */
export function SocialButtons() {
  const [notice, setNotice] = useState<string | null>(null)
  return (
    <View>
      <View className="flex-row gap-2.5">
        {PROVIDERS.map(({ name, Icon }) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            onPress={() => setNotice(`Đăng nhập bằng ${name} sẽ mở sau khi app phát hành.`)}
            className="relative h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-border bg-surface active:bg-surface-2"
          >
            <Icon />
            <Text className="text-sm font-semibold text-text">{name}</Text>
            <View className="absolute -top-2 right-2 rounded-full border border-border bg-surface-2 px-1.5">
              <Text className="text-[10px] font-bold text-text-muted">Sắp có</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {notice && (
        <Text accessibilityLiveRegion="polite" className="mt-2.5 text-[13px] text-text-muted">
          {notice}
        </Text>
      )}
    </View>
  )
}

export function OrDivider({ label }: { label: string }) {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs text-text-muted">{label}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  )
}

export function PasswordInput({ className, ...props }: InputProps) {
  const [shown, setShown] = useState(false)
  return (
    <View className="relative justify-center">
      <Input secureTextEntry={!shown} autoCapitalize="none" className={cn("pr-11", className)} {...props} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onPress={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 w-11 items-center justify-center"
      >
        {shown ? <EyeOff size={20} color={colors["text-muted"]} /> : <Eye size={20} color={colors["text-muted"]} />}
      </Pressable>
    </View>
  )
}

/**
 * Nhãn + ô + lỗi ngay dưới ô: người dùng thấy sai ở đâu mà không phải đọc cả form. Ô nối với
 * react-hook-form qua Controller (TextInput của RN không đăng ký bằng ref như input web).
 */
export function AuthField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  password,
  ...inputProps
}: InputProps & {
  control: Control<T>
  name: FieldPath<T>
  label: string
  error?: string
  password?: boolean
}) {
  const Field = password ? PasswordInput : Input
  return (
    <View className="gap-1.5">
      <Label className="text-[13px] font-semibold">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Field
            accessibilityLabel={label}
            value={field.value ?? ""}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            invalid={!!error}
            {...inputProps}
          />
        )}
      />
      {error && <Text className="text-[13px] text-danger">{error}</Text>}
    </View>
  )
}

// Màu thương hiệu Google, Facebook: ngoại lệ duy nhất của luật không hardcode hex (giống web).
function GoogleIcon() {
  return (
    <Svg viewBox="0 0 48 48" width={18} height={18}>
      <Path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </Svg>
  )
}

function FacebookIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={18} height={18}>
      <Path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"
      />
    </Svg>
  )
}
