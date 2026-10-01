// TẠM (mốc 1): Task 4 chuyển màn onboarding thật.
import { Text } from "react-native"
import { Screen } from "~/components/Screen"

export default function OnboardingPlaceholder() {
  return (
    <Screen>
      <Text className="text-2xl font-extrabold text-text">Hoàn tất hồ sơ</Text>
      <Text className="mt-2 text-sm text-text-muted">Bản mobile chưa có bước này. Hoàn tất hồ sơ trên bản web rồi mở lại app.</Text>
    </Screen>
  )
}
