import { Redirect } from "expo-router"

// Lịch tuần là màn chính, nguồn sự thật — vào app là thấy nó trước (giống web).
export default function Index() {
  return <Redirect href="/schedule" />
}
