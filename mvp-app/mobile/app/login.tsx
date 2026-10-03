import { useState } from "react"
import { Text, View } from "react-native"
import { Link, Redirect, useRouter } from "expo-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
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
      setError(e instanceof ApiError ? e.message : "Đăng nhập thất bại")
    }
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
