/** Hướng dẫn ẩn sau nút "?" ở trang template (chữ từ mockup doc/mockup-template-admin/demo.html). */
export type TemplateHelpKey =
  | "name" | "desc" | "sess" | "equip" | "days" | "inc" | "rules" | "r1" | "r2" | "r3" | "r4" | "sim"

export const TEMPLATE_HELP: Record<TemplateHelpKey, string[]> = {
  name: ["Tên người tập thấy ở màn chọn chương trình. Ví dụ: Full Body 3 buổi."],
  desc: ["Hai, ba câu: chia buổi thế nào, tăng tạ ra sao, hợp với ai. Người tập đọc câu này để chọn."],
  sess: ["Khoảng số buổi một tuần mà template hợp. Người tập khai số buổi lệch khoảng này vẫn thấy template nhưng xếp sau."],
  equip: ["Người tập thiếu bất kỳ thiết bị nào đã chọn thì không thấy template này. Không chọn gì = tập tay không, ai cũng thấy."],
  days: [
    "Buổi chạy luân phiên theo thứ tự (A, B, A, B…), không gắn với thứ trong tuần. Người tập tự chọn ngày tập.",
    "Rep từ–đến: bằng nhau là tăng tạ mỗi khi đủ rep (5–5). Khác nhau là tập tới trần rồi mới tăng tạ (6–8).",
  ],
  inc: [
    "Mỗi bài có dụng cụ một dòng, dùng chung cho mọi buổi có bài đó.",
    "Tăng mỗi lần: số kg cộng thêm khi quy tắc quyết định tăng. Thường tạ đòn 2.5, đẩy vai 1.25, tạ đơn 2.",
    "Không tự tăng: máy không đổi tạ bài này, người tập tự lên quả nặng hơn (hợp với tạ ấm vì quả nhảy cách xa).",
  ],
  rules: [
    "Sau mỗi buổi, máy xét từng bài có tạ theo thứ tự 1 → 4. Gặp quy tắc khớp đầu tiên thì dừng, nên mỗi lần đổi tạ chỉ do một quy tắc và luôn có một câu giải thích.",
    "Mặc định là các số đang chạy hiện nay.",
  ],
  r1: ["Người tập bấm “Báo đau” trong buổi. Giảm theo % rồi làm tròn xuống theo bước tăng của bài, ví dụ 60 kg giảm 10% → 52.5 kg."],
  r2: ["Set hoàn thành = set đạt ít nhất rep từ. Tỉ lệ thấp thường là người tập bỏ dở, chưa đủ dữ liệu để tăng hay giảm."],
  r3: ["RPE là người tập tự chấm độ nặng set cuối, 1–10. Bỏ trống RPE thì quy tắc này bị bỏ qua."],
  r4: ["Quy tắc cuối, luôn ra quyết định.", "Chạm trần = set đạt rep đến.", "Hụt = có set dưới rep từ hoặc bỏ set."],
  sim: ["Nhập một buổi giả định, máy chạy đúng bộ quy tắc ở trên (kể cả số chưa lưu) và cho biết buổi tới tập bao nhiêu kg. Không ghi gì vào dữ liệu thật."],
}
