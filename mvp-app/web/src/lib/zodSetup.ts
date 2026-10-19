import { z } from "zod"

// zod mặc định thử new Function("") để chọn chế độ dịch nhanh. CSP (security-headers.conf) không cho eval nên
// lần thử nào cũng ghi một vi phạm vào console, che mất vi phạm thật. Form của app nhỏ, chế độ thường là đủ.
// File riêng, main.tsx import đầu tiên: zod chọn chế độ ngay lúc dựng z.object ở cấp module, trước thân main.tsx.
z.config({ jitless: true })
