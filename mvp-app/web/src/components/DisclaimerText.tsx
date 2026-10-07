/**
 * Nội dung cam kết an toàn — một bản duy nhất cho bước đầu onboarding và màn Cài đặt › Giới
 * thiệu, để hai nơi không bao giờ lệch chữ với điều người dùng đã đồng ý.
 */
export function DisclaimerText() {
  return (
    <div className="space-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3.5 text-sm leading-relaxed">
      <p>
        Ứng dụng này <strong>không phải công cụ y tế hay vật lý trị liệu</strong>. Nội dung ở đây
        là gợi ý tập luyện chung, không thay thế chẩn đoán hay điều trị của nhân viên y tế.
      </p>
      <p>
        Bạn tự chịu trách nhiệm khi tập. Nếu thấy đau, chóng mặt hoặc khó chịu bất thường, hãy
        dừng lại và hỏi ý kiến bác sĩ.
      </p>
      <p className="text-[var(--color-text-muted)]">
        Phần chấm form qua video chạy bằng máy, có thể sai. Luôn có nút báo "góp ý này sai".
      </p>
    </div>
  )
}
