import { useState } from "react"
import { Text, View } from "react-native"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/types/passwordSchema"
import { ApiError } from "~/api/client"
import { Button } from "~/components/ui/Button"
import { useAuth } from "~/features/auth/components/AuthContext"
import { AuthField } from "~/features/auth/components/AuthLayout"
import { SettingsSubLayout } from "~/features/profile/components/SettingsSubLayout"

/** Bản mobile của ChangePasswordPage web. Đổi xong các thiết bị khác bị đăng xuất. */
export default function ChangePasswordScreen() {
  const { changePassword } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  async function submit(values: ChangePasswordValues) {
    setError(null)
    setDone(false)
    try {
      await changePassword(values.currentPassword, values.newPassword)
      reset()
      setDone(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không đổi được mật khẩu")
    }
  }

  return (
    <SettingsSubLayout title="Đổi mật khẩu">
      <Text className="mt-3 text-sm text-text-muted">
        Đổi xong, các thiết bị khác đang đăng nhập tài khoản này sẽ bị đăng xuất.
      </Text>
      <View className="mt-5 gap-3.5">
        <AuthField
          control={control}
          name="currentPassword"
          label="Mật khẩu hiện tại"
          error={errors.currentPassword?.message}
          password
          autoComplete="current-password"
          textContentType="password"
        />
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
        />
        {error && (
          <Text accessibilityRole="alert" className="text-sm text-danger">
            {error}
          </Text>
        )}
        {done && <Text className="text-sm text-success">Đã đổi mật khẩu.</Text>}
        <Button disabled={isSubmitting} onPress={handleSubmit(submit)}>
          {isSubmitting ? "Đang lưu…" : "Đổi mật khẩu"}
        </Button>
      </View>
    </SettingsSubLayout>
  )
}
