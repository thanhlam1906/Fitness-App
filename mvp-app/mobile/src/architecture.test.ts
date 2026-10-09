/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

// Chuẩn cấu trúc doc/design-chuan-cau-truc-v1.md §7.1 — đọc file nguồn, không thêm thư viện.
// Màn nằm ở app/ (expo-router), nên feature không có pages/.
const MOBILE = path.resolve(__dirname, "..")
const FOLDERS = new Set(["components", "api", "utils", "types"])
// Đúng tên hàm của src/api/client.ts: del, postForm (không có delete).
const API_CALL = /\bapi\.(get|post|postForm|put|patch|del)\b/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = ["src", "app"]
  .flatMap((d) => walk(path.join(MOBILE, d)))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => path.relative(MOBILE, f).split(path.sep).join("/"))
const isTest = (f: string) => /\.test\.tsx?$/.test(f)

describe("chuẩn cấu trúc", () => {
  it("file trong feature nằm trong components/ api/ utils/ types/", () => {
    expect(files.filter((f) => f.startsWith("src/features/") && !FOLDERS.has(f.split("/")[3]))).toEqual([])
  })

  it("chỉ api/ gọi server", () => {
    const wrong = files.filter(
      (f) =>
        !isTest(f) &&
        !f.startsWith("src/api/") &&
        !/^src\/features\/[^/]+\/api\//.test(f) &&
        API_CALL.test(readFileSync(path.join(MOBILE, f), "utf8")),
    )
    expect(wrong).toEqual([])
  })

  // Chờ dữ liệu thì hiện khung xám (src/components/ui/Skeleton.tsx), không hiện chữ — người dùng chốt 10-08.
  // accessibilityLabel="Đang tải" thì được: chỉ VoiceOver đọc, mắt không thấy.
  it("không hiện chữ chờ kiểu Đang tải", () => {
    const wrong = files.filter(
      (f) =>
        !isTest(f) &&
        /Đang (tải|tìm|tính|chuẩn bị|tổng kết)/.test(
          readFileSync(path.join(MOBILE, f), "utf8").replaceAll('accessibilityLabel="Đang tải"', ""),
        ),
    )
    expect(wrong).toEqual([])
  })
})
