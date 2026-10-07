import { describe, expect, it } from "vitest"
import { templateSchema } from "@/features/admin/types/templateSchema"
import { emptyTemplate } from "@/features/admin/utils/templateForm"

function valid() {
  const t = emptyTemplate()
  t.name = "Full Body"
  t.days[0].exercises[0].slug = "push-up"
  return t
}

describe("templateSchema", () => {
  it("template đủ thì hợp lệ", () => {
    expect(templateSchema.safeParse(valid()).success).toBe(true)
  })

  it("rep từ lớn hơn rep đến báo ở ô rep đến", () => {
    const t = valid()
    t.days[0].exercises[0].repsMin = 12
    t.days[0].exercises[0].repsMax = 8
    const r = templateSchema.safeParse(t)
    expect(r.success).toBe(false)
    expect(r.error!.issues[0].path).toEqual(["days", 0, "exercises", 0, "repsMax"])
  })

  it("chưa chọn bài, số buổi ngược, ô trống (NaN) đều lỗi", () => {
    const noSlug = valid()
    noSlug.days[0].exercises[0].slug = ""
    const sessions = valid()
    sessions.sessionsMin = 5
    sessions.sessionsMax = 3
    const nan = valid()
    nan.progression.deloadPct = Number.NaN
    for (const t of [noSlug, sessions, nan]) expect(templateSchema.safeParse(t).success).toBe(false)
  })

  it("bước tăng 0 lỗi, null hợp lệ", () => {
    const zero = valid()
    zero.progression.incrementKg = { squat: 0 }
    const off = valid()
    off.progression.incrementKg = { squat: null }
    expect(templateSchema.safeParse(zero).success).toBe(false)
    expect(templateSchema.safeParse(off).success).toBe(true)
  })
})
