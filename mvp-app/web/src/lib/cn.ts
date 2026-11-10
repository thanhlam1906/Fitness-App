import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Cỡ chữ tự đặt tên trong @theme (src/styles/index.css). Không khai báo thì tailwind-merge coi `text-meta`…
// là class màu, gộp với `text-[var(--color-…)]` sẽ bỏ mất cỡ chữ hoặc màu. Thêm bậc mới ở index.css thì thêm ở đây.
const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["2xs", "meta", "title", "title-lg", "stat", "page", "hero", "load"] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
