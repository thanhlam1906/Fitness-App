import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { Link, Redirect, useRouter } from "expo-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  isPasswordChangeRequired,
  newPasswordSchema,
  type NewPasswordValues,
} from "@/features/auth/types/passwordSchema"
import { ApiError } from "~/api/client"
import { useAuth } from "~/features/auth/components/AuthContext"
import { AuthField, AuthLayout, OrDivider, SocialButtons } from "~/features/auth/components/AuthLayout"
import { Button } from "~/components/ui/Button"

// Chỉ kiểm bắt buộc: z.email() chặt hơn @Email của backend, tài khoản cũ có thể bị chặn oan.
const loginSchema = z.object({
  email: z.string().trim().min(1, "Nhập email"),
  password: z.string().min(1, "Nhập mật khẩu"),
})
type LoginValues = z.infer<typeof loginSchema>

/** Màn 01 concept-frontend-v1.md, dựng lại theo doc/design-ui-m1-v1.md — bản mobile của LoginPage web. */
export default function LoginScreen() {
  const { login, completePasswordChange, isAuthenticated } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  if (isAuthenticated) return <Redirect href="/schedule" />

  async function onSubmit(values: LoginValues) {
    setError(null)
    try {
      await login(values.email, values.password)
      router.replace("/schedule")
    } catch (e) {
      if (isPasswordChangeRequired(e)) {
        setPending({ email: values.email, password: values.password })
        return
      }
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại")
    }
  }

  if (pending) {
    return (
      <NewPasswordStep
        onSubmit={async (newPassword) => {
          await completePasswordChange(pending.email, pending.password, newPassword)
          router.replace("/schedule")
        }}
        onBack={() => setPending(null)}
      />
    )
  }

  return (
    <AuthLayout title="Đăng nhập" subtitle="Tiếp tục lịch tập của bạn.">
      <SocialButtons />
      <OrDivider label="hoặc" />
      <View className="gap-3.5">
        <AuthField
          control={control}
          name="email"
          label="Email"
          error={errors.email?.message}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="ban@email.com"
        />
        <AuthField
          control={control}
          name="password"
          label="Mật khẩu"
          error={errors.password?.message}
          password
          autoComplete="current-password"
          textContentType="password"
          placeholder="Mật khẩu của bạn"
          returnKeyType="go"
          onSubmitEditing={handleSubmit(onSubmit)}
        />
        {error && (
          <Text accessibilityRole="alert" className="text-sm text-danger">
            {error}
          </Text>
        )}
        <Button className="mt-2 w-full" disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
          {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
      </View>
      <Text className="mt-4 text-center text-[13px] text-text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" replace className="font-semibold text-accent">
          Đăng ký
        </Link>
      </Text>
    </AuthLayout>
  )
}

/**
 * Bản mobile của NewPasswordStep trong LoginPage web — giữ chữ và thứ tự. Khác web: sau khi lưu,
 * vào thẳng /schedule (mobile không có location.state.from để quay lại).
 */
function NewPasswordStep({
  onSubmit,
  onBack,
}: {
  onSubmit: (newPassword: string) => Promise<void>
  onBack: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  async function submit(values: NewPasswordValues) {
    setError(null)
    try {
      await onSubmit(values.newPassword)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không đổi được mật khẩu")
    }
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle="Tài khoản đang dùng mật khẩu tạm. Đặt mật khẩu của riêng bạn để tiếp tục.">
      <View className="gap-3.5">
        <AuthField
          control={control}
          name="newPassword"
          label="Mật khẩu mới"
          error={errors.newPassword?.message}
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <AuthField
          control={control}
          name="confirmPassword"
          label="Nhập lại mật khẩu mới"
          error={errors.confirmPassword?.message}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleSubmit(submit)}
        />
        {error && (
          <Text accessibilityRole="alert" className="text-sm text-danger">
            {error}
          </Text>
        )}
        <Button className="mt-2 w-full" disabled={isSubmitting} onPress={handleSubmit(submit)}>
          {isSubmitting ? "Đang lưu…" : "Lưu và vào app"}
        </Button>
      </View>
      <Pressable accessibilityRole="button" onPress={onBack} className="mt-4">
        <Text className="text-center text-[13px] text-text-muted">← Quay lại đăng nhập</Text>
      </Pressable>
    </AuthLayout>
  )
}
