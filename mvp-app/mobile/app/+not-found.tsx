import { Text } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "~/components/Screen"
import { Button } from "~/components/ui/Button"

// Màn web có mà mobile chưa chuyển (plan mobile chuyển dần từng mốc): báo rõ thay vì màn lỗi tiếng Anh.
export default function NotFound() {
  const router = useRouter()
  return (
    <Screen>
      <Text className="text-2xl font-extrabold text-text">Chưa có trên mobile</Text>
      <Text className="mt-2 text-sm text-text-muted">Màn này đang được chuyển sang bản điện thoại. Tạm dùng bản web.</Text>
      <Button variant="secondary" className="mt-6" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
        Quay lại
      </Button>
    </Screen>
  )
}
