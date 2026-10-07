import { Text, View } from "react-native"

/**
 * Nội dung cam kết an toàn — chép nguyên chữ của web/src/components/DisclaimerText.tsx (bước đầu
 * onboarding và Cài đặt › Giới thiệu). Sửa chữ thì sửa cả hai nơi: người dùng đồng ý đúng câu này.
 */
export function DisclaimerText() {
  return (
    <View className="gap-2 rounded-md bg-surface p-3.5">
      <Text className="text-sm leading-[22px] text-text">
        Ứng dụng này <Text className="font-bold">không phải công cụ y tế hay vật lý trị liệu</Text>. Nội
        dung ở đây là gợi ý tập luyện chung, không thay thế chẩn đoán hay điều trị của nhân viên y tế.
      </Text>
      <Text className="text-sm leading-[22px] text-text">
        Bạn tự chịu trách nhiệm khi tập. Nếu thấy đau, chóng mặt hoặc khó chịu bất thường, hãy dừng lại
        và hỏi ý kiến bác sĩ.
      </Text>
      <Text className="text-sm leading-[22px] text-text-muted">
        Phần chấm form qua video chạy bằng máy, có thể sai. Luôn có nút báo "góp ý này sai".
      </Text>
    </View>
  )
}
