import Constants from "expo-constants"

// Dev: iPhone mở app qua IP mạng LAN của máy chạy Metro. Backend (:8080) và server web (:5173,
// phục vụ ảnh bài tập) chạy trên cùng máy đó nên chỉ cần đổi cổng — không phải cấu hình gì.
function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri // vd. "192.168.2.7:8081"
  return hostUri ? hostUri.split(":")[0] : "localhost"
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${devHost()}:8080`

export function assetUrl(path: string): string {
  return `http://${devHost()}:5173${path}`
}
