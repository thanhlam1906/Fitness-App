// Phải đứng đầu: cấu hình zod trước khi module nào dựng schema (xem file).
import "@/lib/zodSetup"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApiError } from "@/api/client"
import { AuthProvider } from "@/features/auth/components/AuthContext"
import { App } from "@/App"
import "@/styles/index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Chuyển qua lại giữa các màn không tải lại dữ liệu vừa có (lịch 60 KB mỗi lần). Mutation tự làm mới thứ nó đổi.
      staleTime: 30_000,
      // 4xx là câu trả lời chắc chắn của server (thiếu quyền, không có, dữ liệu sai): thử lại vẫn thế, chỉ bắt
      // người dùng chờ thêm vài giây mới thấy lỗi. Chỉ thử lại lỗi mạng và 5xx.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 3,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
