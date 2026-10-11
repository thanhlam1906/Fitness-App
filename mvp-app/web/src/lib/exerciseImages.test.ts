/// <reference types="node" />
// tsconfig.app.json chỉ khai "types": ["vite/client"] (code chạy trình duyệt,
// không cần Node) — reference riêng ở đây để tsc nhận node:fs/node:path/
// import.meta.url mà không phải sửa tsconfig chung.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_RESOURCES = path.join(HERE, "..", "..", "..", "backend", "src", "main", "resources")
const SEED_SQL_PATH = path.join(BACKEND_RESOURCES, "db", "migration", "R__seed_content.sql")
// Ảnh 20 bài seed nạp vào DB một lần bằng migration V17 (doc/design-anh-bai-tap-v1.md §3).
const SEED_IMAGES_DIR = path.join(BACKEND_RESOURCES, "exercise-images")

// Chỉ rút slug trong khối "INSERT INTO exercises ... ON CONFLICT" — khối
// form_checks bên dưới dùng cú pháp VALUES giống hệt nhưng cột đầu là code
// (knee_track, depth, torso_lean), không phải slug bài tập, lấy nhầm là sai.
function extractExerciseSlugs(sql: string): string[] {
  const blockMatch = sql.match(/INSERT INTO exercises[\s\S]*?ON CONFLICT/)
  if (!blockMatch) return []
  const slugMatches = blockMatch[0].matchAll(/\(\s*'([a-z0-9-]+)'/g)
  return [...slugMatches].map((m) => m[1])
}

describe("ảnh nạp sẵn khớp các bài trong seed", () => {
  const slugs = extractExerciseSlugs(readFileSync(SEED_SQL_PATH, "utf-8"))
  const files = readdirSync(SEED_IMAGES_DIR)

  it("rút đúng 20 slug từ khối exercises — regex hỏng phải đỏ, không xanh giả", () => {
    expect(slugs).toHaveLength(20)
    expect(slugs).toContain("goblet-squat")
  })

  it.each(slugs.map((slug) => [slug]))("%s có ảnh tĩnh", (slug) => {
    expect(existsSync(path.join(SEED_IMAGES_DIR, `${slug}.jpg`))).toBe(true)
  })

  it("mọi file ảnh nạp sẵn thuộc một bài trong seed, chỉ .jpg hoặc .gif", () => {
    for (const f of files) {
      expect(f).toMatch(/\.(jpg|gif)$/)
      expect(slugs).toContain(f.replace(/\.(jpg|gif)$/, ""))
    }
    expect(files.filter((f) => f.endsWith(".gif"))).toHaveLength(16)
  })
})
