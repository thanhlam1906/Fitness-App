import { describe, expect, it } from "vitest"
import { angleNote, checkDetails, missingViews, checkLabel, evidenceLine, evidenceOf, gradedOf, isOverallOk } from "./reviewView"
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

const GRADED = {
  view: "SAGITTAL",
  measure: "knee",
  moment: "PEAK",
  from: null,
  to: 100,
  warn: 15,
  values: [
    { rep: 1, value: 88 },
    { rep: 2, value: 105 },
  ],
  worst: { rep: 2, value: 105 },
}

describe("kết quả chấm theo ngưỡng", () => {
  it("đọc measured kiểu mới, bỏ qua kiểu cũ và kiểu thiếu số", () => {
    expect(gradedOf(check({ measured: JSON.stringify(GRADED) }))?.worst).toEqual({ rep: 2, value: 105 })
    expect(gradedOf(check({ measured: JSON.stringify({ view: "FRONTAL", reps: 1 }) }))).toBeNull()
    expect(gradedOf(check({ measured: JSON.stringify({ evidence: [] }) }))).toBeNull()
    expect(gradedOf(check({}))).toBeNull()
  })

  it("dòng số: rep tệ nhất kèm khoảng cần đạt, rồi từng rep", () => {
    expect(checkDetails(check({ measured: JSON.stringify(GRADED) }))).toEqual([
      "Góc gối lúc sâu nhất: 105° ở rep 2 (cần không quá 100°)",
      "Từng rep: 88° · 105°",
    ])
  })

  it("kết quả cũ do LLM chấm vẫn ra dòng dẫn chứng", () => {
    expect(checkDetails(check({ measured: JSON.stringify({ evidence: [EVIDENCE] }) }))).toEqual([
      "Rep 4 · góc ngang · tỉ lệ độ sâu ở điểm xa nhất 1.42",
    ])
  })
})

describe("angleNote", () => {
  const guide = {
    angles: [
      { code: "SAGITTAL", label: "Ngang", why: "kiểm tra độ sâu — quan trọng nhất " },
      { code: "FRONTAL", label: "Chính diện", why: "   " },
    ],
  }

  it("giữ nguyên câu admin nhập, kể cả dấu gạch admin tự gõ", () => {
    expect(angleNote(guide, "SAGITTAL")).toBe("kiểm tra độ sâu — quan trọng nhất")
  })

  it("góc admin chưa nhập, nhập toàn khoảng trắng, hoặc chưa có hướng dẫn thì không có dòng nào", () => {
    expect(angleNote(guide, "FRONTAL")).toBeNull()
    expect(angleNote(guide, "DIAGONAL")).toBeNull()
    expect(angleNote(null, "SAGITTAL")).toBeNull()
  })
})

describe("missingViews", () => {
  it("bài cần 2 góc mà mới gửi 1 thì báo góc còn thiếu", () => {
    expect(missingViews(["SAGITTAL", "FRONTAL"], ["SAGITTAL"])).toEqual(["FRONTAL"])
  })

  it("hai clip cùng một góc vẫn tính là thiếu góc kia", () => {
    expect(missingViews(["SAGITTAL", "FRONTAL"], ["SAGITTAL", "SAGITTAL"])).toEqual(["FRONTAL"])
  })

  it("đủ góc thì không thiếu, thứ tự clip không quan trọng", () => {
    expect(missingViews(["SAGITTAL", "FRONTAL"], ["FRONTAL", "SAGITTAL"])).toEqual([])
  })

  it("clip góc thừa không làm thiếu góc nào", () => {
    expect(missingViews(["SAGITTAL"], ["SAGITTAL", "DIAGONAL"])).toEqual([])
  })
})
