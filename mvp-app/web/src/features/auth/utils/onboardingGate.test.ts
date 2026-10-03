import { describe, expect, it } from "vitest"
import { shouldResumeOnboarding } from "./onboardingGate"

describe("shouldResumeOnboarding", () => {
  it("chưa xong onboarding thì đưa về onboarding", () =>
    expect(shouldResumeOnboarding("USER", "GOAL", "/schedule")).toBe(true))

  it("xong rồi thì không", () => expect(shouldResumeOnboarding("USER", "DONE", "/schedule")).toBe(false))

  it("đang ở onboarding thì không chuyển nữa", () =>
    expect(shouldResumeOnboarding("USER", "BODY", "/onboarding")).toBe(false))

  it("admin (HLV) không đi onboarding", () =>
    expect(shouldResumeOnboarding("ADMIN", "DISCLAIMER", "/admin/exercises")).toBe(false))

  it("chưa biết bước (hồ sơ đang tải hoặc lỗi) thì không chặn", () =>
    expect(shouldResumeOnboarding("USER", undefined, "/schedule")).toBe(false))
})
