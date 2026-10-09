import { describe, expect, it } from "vitest"
import { BODY_AREAS } from "@/features/workout/types"
import { BODY_VIEWS } from "@/features/workout/utils/bodyMap"
import { BODY_PATHS } from "@/features/workout/utils/bodyPaths"

const view = (key: "front" | "back") => BODY_VIEWS.find((v) => v.key === key)!
const mid = (key: "front" | "back") => {
  const [x, , w] = view(key).vb.split(" ").map(Number)
  return x + w / 2
}
/** Điểm đầu "M x y" của path — mọi mảng bấm được nằm trọn một bên trục giữa. */
const startX = (d: string) => parseFloat(d.slice(1))
const pathsOf = (key: "front" | "back", area: string) => view(key).areas.find((a) => a.area.value === area)?.paths ?? []

describe("BODY_VIEWS", () => {
  it("mọi vùng trừ Chỗ khác đều bấm được trên hình, Chỗ khác thì không", () => {
    const onMap = new Set(BODY_VIEWS.flatMap((v) => v.areas.map((a) => a.area.value)))
    for (const area of BODY_AREAS) {
      expect(onMap.has(area.value), area.value).toBe(area.value !== "OTHER")
    }
  })

  it("vai trái nằm nửa phải màn hình ở mặt trước, nửa trái ở mặt sau", () => {
    expect(pathsOf("front", "SHOULDER_L").every((d) => startX(d) > mid("front"))).toBe(true)
    expect(pathsOf("front", "SHOULDER_R").every((d) => startX(d) < mid("front"))).toBe(true)
    expect(pathsOf("back", "SHOULDER_L").every((d) => startX(d) < mid("back"))).toBe(true)
    expect(pathsOf("back", "SHOULDER_R").every((d) => startX(d) > mid("back"))).toBe(true)
  })

  it("gối trái nằm nửa phải màn hình ở mặt trước", () => {
    expect(pathsOf("front", "KNEE_L").length).toBeGreaterThan(0)
    expect(pathsOf("front", "KNEE_L").every((d) => startX(d) > mid("front"))).toBe(true)
    expect(pathsOf("front", "KNEE_R").every((d) => startX(d) < mid("front"))).toBe(true)
  })

  it("mỗi vùng chỉ có một lần là điểm dừng bàn phím, dù hiện ở cả hai mặt", () => {
    const primaries = BODY_VIEWS.flatMap((v) => v.areas.filter((a) => a.primary).map((a) => a.area.value))
    expect(primaries.sort()).toEqual(BODY_AREAS.filter((a) => a.value !== "OTHER").map((a) => a.value).sort())
  })

  it("chỗ nào trên hình cũng bấm được: không path nào bị sót", () => {
    for (const v of BODY_VIEWS) {
      const all = Object.values(BODY_PATHS[v.key].p).flat()
      const clickable = v.areas.flatMap((a) => a.paths)
      expect(clickable.length).toBe(all.length)
    }
  })
})
