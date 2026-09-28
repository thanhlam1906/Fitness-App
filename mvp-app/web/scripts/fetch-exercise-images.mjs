// Tải ảnh minh hoạ động tác (2 khung/bài) từ free-exercise-db
// (github.com/yuhonas/free-exercise-db, giấy phép Unlicense — public domain).
// Chạy: node scripts/fetch-exercise-images.mjs (từ mvp-app/web).
import { access, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

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
  // 09-26, đã xem từng ảnh. Lunge lùi dùng ảnh lunge bước tới: khung đáy giống hệt,
  // còn Crossover_Reverse_Lunge có xoay người dễ hiểu sai. Swing là biến thể một tay.
  "bodyweight-squat": "Bodyweight_Squat",
  "reverse-lunge": "Bodyweight_Walking_Lunge",
  "glute-bridge": "Butt_Lift_Bridge",
  "decline-push-up": "Push-Ups_With_Feet_Elevated",
  superman: "Superman",
  "dead-bug": "Dead_Bug",
  "goblet-squat": "Goblet_Squat",
  "lunge-dumbbell": "Dumbbell_Rear_Lunge",
  "dumbbell-floor-press": "Dumbbell_Floor_Press",
  "one-arm-row": "One-Arm_Dumbbell_Row",
  "biceps-curl": "Dumbbell_Bicep_Curl",
  "lateral-raise": "Side_Lateral_Raise",
  "kettlebell-swing": "One-Arm_Kettlebell_Swings",
  "barbell-bench-press": "Barbell_Bench_Press_-_Medium_Grip",
  deadlift: "Barbell_Deadlift",
}

// Ảnh động cho khung chi tiết bài (doc/design-anh-dong-v1.md): mã GIF của ExerciseDB bản
// miễn phí (oss.exercisedb.dev). Cũng viết tay và đã mở từng ảnh xem tận mắt. API giới hạn số
// lần gọi nên app không gọi lúc chạy, chỉ tải một lần về public/exercises/<slug>.gif.
const SLUG_TO_EXERCISEDB_GIF = {
  // Không có bản đúng trong bản miễn phí nên giữ ảnh chụp: bodyweight-squat (chỉ có biến
  // thể nhảy, một chân), reverse-lunge (chỉ có lunge bước tới), superman (chỉ có bản trên máy
  // hoặc bóng), dumbbell-floor-press.
  "barbell-back-squat": "qXTaZnJ", // barbell full squat
  "romanian-deadlift": "wQ2c4XD", // barbell romanian deadlift
  "overhead-press": "A6wtbuL", // dumbbell standing overhead press
  "push-up": "I4hDWkc", // push-up
  "bent-over-row": "eZyBC3j", // barbell bent over row
  "glute-bridge": "u0cNiij", // low glute bridge on floor
  "decline-push-up": "i5cEhka", // decline push-up
  "dead-bug": "iny3m5y", // dead bug
  "goblet-squat": "yn8yg1r", // dumbbell goblet squat
  "lunge-dumbbell": "SSsBDwB", // dumbbell rear lunge
  "one-arm-row": "C0MA9bC", // dumbbell one arm bent-over row
  "biceps-curl": "NbVPDMW", // dumbbell biceps curl
  "lateral-raise": "DsgkuIt", // dumbbell lateral raise
  "kettlebell-swing": "UHJlbu3", // kettlebell swing
  "barbell-bench-press": "EIeI8Vf", // barbell bench press
  deadlift: "ila4NZS", // barbell deadlift
}

const BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
const GIF_BASE_URL = "https://static.exercisedb.dev/media"
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

async function download(url, outPath, label) {
  if (await fileExists(outPath)) {
    console.log(`bỏ qua (đã có): ${label}`)
    return
  }
  const res = await fetch(url)
  if (res.status !== 200) {
    console.error(`Lỗi tải ${url}: HTTP ${res.status}`)
    process.exit(1)
  }
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()))
  console.log(`đã tải: ${label}`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const [slug, sourceDir] of Object.entries(SLUG_TO_SOURCE_DIR)) {
    await fetchFrame(slug, sourceDir, 0)
    await fetchFrame(slug, sourceDir, 1)
  }
  for (const [slug, id] of Object.entries(SLUG_TO_EXERCISEDB_GIF)) {
    await download(`${GIF_BASE_URL}/${id}.gif`, path.join(OUT_DIR, `${slug}.gif`), `${slug}.gif`)
  }
}

main()
