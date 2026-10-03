import { describe, expect, it } from "vitest"
import { checkLabel, evidenceLine, evidenceOf, isOverallOk } from "./reviewView"
import type { CheckResult } from "@/features/review/types"

const check = (over: Partial<CheckResult>): CheckResult => ({
  id: "1",
  code: null,
  name: null,
  verdict: "PASS",
  confidence: null,
  measured: null,
  cueTextVi: null,
  isPrimary: false,
  ...over,
})
const EVIDENCE = {
  clip: 1,
  view: "SAGITTAL",
  view_vi: "ngang",
  rep: 4,
  feature: "depth_ratio_P",
  label_vi: "tỉ lệ độ sâu ở điểm xa nhất",
  value: 1.42,
  unit: "",
}

describe("reviewView", () => {
  it("tên mục: LLM có name, kết quả rule cũ dùng code", () => {
    expect(checkLabel(check({ name: "Độ sâu", code: "depth" }))).toBe("Độ sâu")
    expect(checkLabel(check({ code: "depth" }))).toBe("depth")
    expect(checkLabel(check({}))).toBe("—")
  })

  it("kỹ thuật ổn khi không có FAIL hay WARN", () => {
    expect(isOverallOk([check({ verdict: "PASS" }), check({ verdict: "NOT_APPLICABLE" })])).toBe(true)
    expect(isOverallOk([check({ verdict: "PASS" }), check({ verdict: "WARN" })])).toBe(false)
  })

  it("đọc dẫn chứng từ measured, hỏng hay kiểu cũ thì bỏ qua", () => {
    expect(evidenceOf(check({ measured: JSON.stringify({ evidence: [EVIDENCE] }) }))).toEqual([EVIDENCE])
    expect(evidenceOf(check({ measured: '{"metric": "hip_depth_ratio"}' }))).toEqual([])
    expect(evidenceOf(check({ measured: "khong phai json" }))).toEqual([])
    expect(evidenceOf(check({}))).toEqual([])
  })

  it("dòng dẫn chứng nói rep, góc quay, số đo và đơn vị", () => {
    expect(evidenceLine(EVIDENCE)).toBe("Rep 4 · góc ngang · tỉ lệ độ sâu ở điểm xa nhất 1.42")
    expect(evidenceLine({ ...EVIDENCE, rep: 2, feature: "torso_lean", label_vi: "thân đổ thêm", value: 31, unit: "°" })).toBe(
      "Rep 2 · góc ngang · thân đổ thêm 31°",
    )
  })
})
