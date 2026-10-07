import { Text, View } from "react-native"
import { Check } from "lucide-react-native"
import { formatDate } from "@/lib/format"
import { DisclaimerText } from "~/components/DisclaimerText"
import { Kicker } from "~/components/Kicker"
import { Logo } from "~/components/Logo"
import { SettingsSubLayout } from "~/features/profile/components/SettingsSubLayout"
import { useProfile } from "~/features/profile/api/useProfile"
import { colors } from "~/theme"

/** Cài đặt › Giới thiệu & điều khoản. Nội dung cam kết là đúng bản người dùng đã đồng ý ở onboarding. */
export default function AboutScreen() {
  const profile = useProfile()
  const acceptedAt = profile.data?.disclaimerAt

  return (
    <SettingsSubLayout title="Giới thiệu">
      <View className="mt-5 flex-row items-center gap-3">
        <Logo />
        <Text className="text-xs text-text-muted">Bản thử nghiệm</Text>
      </View>

      {acceptedAt && (
        <View className="mt-4 flex-row items-center gap-2 rounded-md bg-success-tint px-3 py-2.5">
          <Check size={16} color={colors.success} />
          <Text className="flex-1 text-[13px] font-semibold text-success" style={{ fontVariant: ["tabular-nums"] }}>
            Bạn đã đồng ý cam kết an toàn ngày {formatDate(acceptedAt)}
          </Text>
        </View>
      )}

      <Kicker className="mt-6">Cam kết an toàn</Kicker>
      <View className="mt-2">
        <DisclaimerText />
      </View>
    </SettingsSubLayout>
  )
}
