import { describe, expect, it } from "vitest"
import { cn } from "./cn"

describe("cn: cỡ chữ tự đặt tên trong @theme", () => {
  it("đứng cạnh class màu thì giữ cả cỡ lẫn màu", () => {
    for (const size of ["text-2xs", "text-meta", "text-title", "text-title-lg", "text-stat", "text-page", "text-hero", "text-load"]) {
      expect(cn(size, "text-[var(--color-text-muted)]")).toBe(`${size} text-[var(--color-text-muted)]`)
    }
  })

  it("hai cỡ chữ thì cỡ sau thắng, như cỡ sẵn có của Tailwind", () => {
    expect(cn("text-xs", "text-meta")).toBe("text-meta")
    expect(cn("text-meta", "text-sm")).toBe("text-sm")
  })
})
