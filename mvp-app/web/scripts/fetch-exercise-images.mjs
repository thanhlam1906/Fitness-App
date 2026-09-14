// Tải ảnh minh hoạ động tác (2 khung/bài) từ free-exercise-db
// (github.com/yuhonas/free-exercise-db, giấy phép Unlicense — public domain).
// Chạy: node scripts/fetch-exercise-images.mjs (từ mvp-app/web).
//
// Bảng map dưới đây viết TAY, không tự suy ra được từ slug: tên thư mục nguồn
// không theo quy ước đặt tên của ta, và có thư mục dễ nhầm — vd
// Barbell_Shoulder_Press là đẩy vai NGỒI GHẾ, khác overhead-press của ta là đẩy
// ĐỨNG (đã suýt map nhầm). Thêm dòng mới PHẢI mở ảnh ra nhìn tận mắt trước khi
// ghi vào bảng, không đoán theo tên.
const SLUG_TO_SOURCE_DIR = {
  "barbell-back-squat": "Barbell_Squat",
  "romanian-deadlift": "Romanian_Deadlift",
  "overhead-press": "Standing_Military_Press",
  "push-up": "Pushups",
  "bent-over-row": "Bent_Over_Barbell_Row",
}

import { access, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises")

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

// Số khung ảnh nguồn không nhất quán khung nào là đứng thẳng/đáy giữa các bài
// (vd Barbell_Squat khung 0 đứng thẳng, Romanian_Deadlift khung 1 mới đứng
// thẳng) — nên tên file ra giữ nguyên số gốc, không đặt theo nghĩa top/bottom.
async function fetchFrame(slug, sourceDir, frame) {
  const outPath = path.join(OUT_DIR, `${slug}-${frame}.jpg`)
  if (await fileExists(outPath)) {
    console.log(`bỏ qua (đã có): ${slug}-${frame}.jpg`)
    return
  }

  const url = `${BASE_URL}/${sourceDir}/${frame}.jpg`
  const res = await fetch(url)
  if (res.status !== 200) {
    console.error(`Lỗi tải ${url}: HTTP ${res.status}`)
    process.exit(1)
  }

  await writeFile(outPath, Buffer.from(await res.arrayBuffer()))
  console.log(`đã tải: ${slug}-${frame}.jpg`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const [slug, sourceDir] of Object.entries(SLUG_TO_SOURCE_DIR)) {
    await fetchFrame(slug, sourceDir, 0)
    await fetchFrame(slug, sourceDir, 1)
  }
}

main()
