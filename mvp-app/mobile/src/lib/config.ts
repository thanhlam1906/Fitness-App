import Constants from "expo-constants"

// Dev: iPhone mở app qua IP mạng LAN của máy chạy Metro. Backend (:8080) và server web (:5173,
// phục vụ ảnh minh hoạ góc quay ở public/form-check) chạy trên cùng máy đó nên chỉ cần đổi cổng — không phải cấu hình gì.
function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri // vd. "192.168.2.7:8081"
  return hostUri ? hostUri.split(":")[0] : "localhost"
}

// Dòng để trống trong .env coi như không đặt, để API và ảnh cùng một cách hiểu.
const PROD_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || undefined

export const API_URL = PROD_URL ?? `http://${devHost()}:8080`

// Bản build (APK) có EXPO_PUBLIC_API_URL và không có máy dev :5173. Nginx ở origin đó phát luôn
// file public/ của web, nên ảnh lấy từ chính origin đó; không thế thì APK mất hết ảnh.
export function assetUrl(path: string): string {
  return PROD_URL ? `${PROD_URL}${path}` :`http://${devHost()}:5173${path}`
}
