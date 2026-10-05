import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Chuẩn cấu trúc doc/design-chuan-cau-truc-v1.md §7.1 — đọc file nguồn, không thêm thư viện.
const SRC = path.dirname(fileURLToPath(import.meta.url))
const FOLDERS = new Set(["pages", "components", "api", "utils", "types"])
const API_CALL = /\bapi\.(get|post|put|patch|delete)\b/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = walk(SRC)
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => path.relative(SRC, f).split(path.sep).join("/"))
const isTest = (f: string) => /\.test\.tsx?$/.test(f)

describe("chuẩn cấu trúc", () => {
  it("file trong feature nằm trong pages/ components/ api/ utils/ types/", () => {
    expect(files.filter((f) => f.startsWith("features/") && !FOLDERS.has(f.split("/")[2]))).toEqual([])
  })

  it("chỉ api/ gọi server", () => {
    const wrong = files.filter(
      (f) =>
        !isTest(f) &&
        !f.startsWith("api/") &&
        !/^features\/[^/]+\/api\//.test(f) &&
        API_CALL.test(readFileSync(path.join(SRC, f), "utf8")),
    )
    expect(wrong).toEqual([])
  })

  it("đuôi Page chỉ nằm trong pages/, pages/ chỉ chứa đuôi Page", () => {
    expect(files.filter((f) => !isTest(f) && f.endsWith("Page.tsx") !== f.includes("/pages/"))).toEqual([])
  })
})
