import { useState } from "react"
import { Text, View } from "react-native"
import { Link, Redirect, useRouter } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, toRegisterPayload, type RegisterValues } from "@/auth/registerSchema"
import { ApiError } from "~/api/client"
import { useAuth } from "~/auth/AuthContext"
import { AuthField, AuthLayout, OrDivider, SocialButtons } from "~/auth/AuthLayout"
import { Button } from "~/components/ui/Button"
import { Checkbox } from "~/components/ui/Checkbox"

/** Bản mobile của RegisterPage web — cùng schema, cùng chữ. */
export default function RegisterScreen() {
  const { register: registerUser, isAuthenticated } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  if (isAuthenticated) return <Redirect href="/schedule" />

  async function onSubmit(values: RegisterValues) {
    setError(null)
    try {
      await registerUser(toRegisterPayload(values))
      router.replace("/onboarding")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Đăng ký thất bại")
    }
  }

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Mất khoảng một phút.">
      <SocialButtons />
      <OrDivider label="hoặc đăng ký bằng email" />
      <View className="gap-3.5">
        <AuthField
          control={control}
          name="fullName"
          label="Họ và tên"
          error={errors.fullName?.message}
          autoComplete="name"
          textContentType="name"
          placeholder="Nguyễn Văn A"
        />
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
          name="phone"
          label="Số điện thoại"
          error={errors.phone?.message}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="0912 345 678"
        />
        <AuthField
          control={control}
          name="password"
          label="Mật khẩu"
          error={errors.password?.message}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Tối thiểu 8 ký tự"
        />
        <AuthField
          control={control}
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          error={errors.confirmPassword?.message}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Gõ lại mật khẩu"
        />
        <View>
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                invalid={!!errors.acceptTerms}
                className="pt-1"
              >
                {/* Chưa có trang điều khoản (F1 concept-frontend) nên chỉ in đậm, chưa là link. */}
                <Text className="flex-1 text-[13px] leading-[18px] text-text-muted">
                  Tôi đồng ý với <Text className="font-bold text-text">Điều khoản sử dụng</Text> và{" "}
                  <Text className="font-bold text-text">Chính sách bảo mật</Text> của VFit
                </Text>
              </Checkbox>
            )}
          />
          {errors.acceptTerms && (
            <Text className="mt-1.5 text-[13px] text-danger">{errors.acceptTerms.message}</Text>
          )}
        </View>
        {error && (
          <Text accessibilityRole="alert" className="text-sm text-danger">
            {error}
          </Text>
        )}
        <Button className="mt-2 w-full" disabled={isSubmitting} onPress={handleSubmit(onSubmit)}>
          {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
        </Button>
      </View>
      <Text className="mt-4 text-center text-[13px] text-text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" replace className="font-semibold text-accent">
          Đăng nhập
        </Link>
      </Text>
    </AuthLayout>
  )
}
