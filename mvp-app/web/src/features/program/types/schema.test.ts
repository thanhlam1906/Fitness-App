import { describe, expect, it } from "vitest"
import { defaultTrainingDays } from "./schema"

describe("defaultTrainingDays", () => {
  it("số buổi đã khai nằm trong khoảng template thì giữ nguyên, giãn đều trong tuần", () =>
    expect(defaultTrainingDays({ sessionsMin: 2, sessionsMax: 3 }, 3)).toEqual([1, 3, 5]))

  it("khai nhiều hơn template cho phép thì hạ về trần của template", () =>
    expect(defaultTrainingDays({ sessionsMin: 4, sessionsMax: 4 }, 6)).toEqual([1, 2, 4, 5]))

  it("khai ít hơn thì nâng lên sàn của template", () =>
    expect(defaultTrainingDays({ sessionsMin: 5, sessionsMax: 6 }, 2)).toEqual([1, 2, 3, 4, 5]))

  it("hồ sơ chưa có số buổi thì lấy sàn của template", () =>
    expect(defaultTrainingDays({ sessionsMin: 2, sessionsMax: 4 }, null)).toEqual([1, 4]))
})
