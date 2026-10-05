/**
 * Hướng dẫn ẩn sau nút "?" ở trang bài tập (người dùng yêu cầu 10-05; chữ lấy từ mockup
 * doc/mockup-form-check-admin/demo.html). Mỗi phần tử là một dòng.
 */
export type HelpKey = "name" | "form" | "view" | "measure" | "moment" | "range" | "warn" | "label" | "cue"

export const HELP: Record<HelpKey, string[]> = {
  name: ["Tên người tập thấy khi chọn bài. Dùng tên tiếng Việt quen thuộc. Ví dụ: Squat tay không."],
  form: [
    "Làm 2 bước: chọn góc camera ở 3 ô bên dưới, rồi bấm “+ Thêm khớp cần kiểm” và điền.",
    "Người tập sẽ được hướng dẫn quay đúng những góc có khớp. Bài chưa có khớp nào thì chưa chấm form được.",
  ],
  view: [
    "Ngang: camera bên hông, thấy rõ gập gối, gập hông, thân nghiêng.",
    "Chính diện: camera trước mặt, thấy gối chụm, hai bên lệch nhau.",
    "Chéo 45°: thấy một phần cả hai, kém chính xác. Chỉ dùng khi bài không quay ngang hay chính diện được.",
  ],
  measure: ["Chọn chỗ cần kiểm. Hình bên phải sáng đúng chỗ đo. Mỗi góc chỉ hiện những khớp đo đúng được ở góc đó."],
  moment: [
    "Lúc bắt đầu: tư thế chuẩn bị, trước khi xuống.",
    "Lúc sâu nhất: điểm cuối động tác, như đáy squat, ngực gần sàn khi chống đẩy, tạ lên cao nhất khi cuốn tạ.",
  ],
  range: [
    "Khoảng độ được tính là đúng. Ví dụ ngồi đủ sâu: góc gối lúc sâu nhất từ (trống) đến 100°, tức là không quá 100°.",
    "Bỏ trống ô “từ” nếu chỉ cần không quá; bỏ trống ô “đến” nếu chỉ cần ít nhất.",
    "Chưa biết điền số nào? Tự tập trước camera, xem số đo trên màn kết quả rồi điền.",
  ],
  warn: [
    "Vùng vàng giữa đúng và sai: người tập chỉ bị nhắc nhẹ. Ví dụ đạt đến 100°, sát ngưỡng 15° thì 100°–115° nhắc nhẹ, trên 115° mới tính là sai. Để 0 nếu không cần.",
  ],
  label: ["Tên mục hiện trên màn kết quả. Ngắn, nói điều cần làm đúng. Ví dụ: Ngồi đủ sâu."],
  cue: ["Câu app nói khi người tập sai mục này: một việc cụ thể cần làm, tối đa 2 câu. Ví dụ: Hạ hông tới khi đùi song song sàn."],
}
