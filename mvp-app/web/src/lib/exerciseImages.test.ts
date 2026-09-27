/// <reference types="node" />
// tsconfig.app.json chỉ khai "types": ["vite/client"] (code chạy trình duyệt,
// không cần Node) — reference riêng ở đây để tsc nhận node:fs/node:path/
// import.meta.url mà không phải sửa tsconfig chung.
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SEED_SQL_PATH = path.join(HERE, "..", "..", "..", "backend", "src", "main", "resources", "db", "migration", "R__seed_content.sql")
const EXERCISES_DIR = path.join(HERE, "..", "..", "public", "exercises")

// Chỉ rút slug trong khối "INSERT INTO exercises ... ON CONFLICT" — khối
// form_checks bên dưới dùng cú pháp VALUES giống hệt nhưng cột đầu là code
// (knee_track, depth, torso_lean), không phải slug bài tập, lấy nhầm là sai.
function extractExerciseSlugs(sql: string): string[] {
  const blockMatch = sql.match(/INSERT INTO exercises[\s\S]*?ON CONFLICT/)
  if (!blockMatch) return []
  const slugMatches = blockMatch[0].matchAll(/\(\s*'([a-z0-9-]+)'/g)
  return [...slugMatches].map((m) => m[1])
}

describe("ảnh minh hoạ động tác đủ cho mọi bài trong seed", () => {
  const sql = readFileSync(SEED_SQL_PATH, "utf-8")
  const slugs = extractExerciseSlugs(sql)

  it("rút đúng 20 slug từ khối exercises — regex hỏng phải đỏ, không xanh giả", () => {
    expect(slugs).toEqual([
      "barbell-back-squat",
      "romanian-deadlift",
      "overhead-press",
      "push-up",
      "bent-over-row",
      "bodyweight-squat",
      "reverse-lunge",
      "glute-bridge",
      "decline-push-up",
      "superman",
      "dead-bug",
      "goblet-squat",
      "lunge-dumbbell",
      "dumbbell-floor-press",
      "one-arm-row",
      "biceps-curl",
      "lateral-raise",
      "kettlebell-swing",
      "barbell-bench-press",
      "deadlift",
    ])
  })

  it.each(slugs.map((slug) => [slug]))("có đủ 2 khung ảnh cho %s", (slug) => {
    expect(existsSync(path.join(EXERCISES_DIR, `${slug}-0.jpg`))).toBe(true)
    expect(existsSync(path.join(EXERCISES_DIR, `${slug}-1.jpg`))).toBe(true)
  })
})
