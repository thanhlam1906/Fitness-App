import { BODY_AREAS } from "@/features/workout/types"
import { BODY_PATHS } from "@/features/workout/utils/bodyPaths"

type BodyArea = (typeof BODY_AREAS)[number]
type AreaValue = BodyArea["value"]

/**
 * Bộ phận trên hình → vùng đau. Mọi bộ phận đều có vùng để chỗ nào trên hình cũng bấm được
 * (người dùng chốt 10-08); test chặn bộ phận bị sót. Hình chia theo cơ, danh sách vùng đau có
 * khớp, nên khuỷu tay lấy cẳng tay và cổ tay lấy bàn tay.
 *
 * TRÁI/PHẢI TÍNH THEO NGƯỜI TRONG HÌNH (quy ước y tế). Làm ngược là báo đau sai bên, mà báo đau
 * là tín hiệu ưu tiên cao nhất của engine điều chỉnh tải.
 */
const PART_AREA: Record<string, AreaValue | { L: AreaValue; R: AreaValue }> = {
  deltoids: { L: "SHOULDER_L", R: "SHOULDER_R" },
  knees: { L: "KNEE_L", R: "KNEE_R" },
  trapezius: "UPPER_BACK",
  "upper-back": "UPPER_BACK",
  "lower-back": "LOWER_BACK",
  gluteal: "HIP",
  "hip-flexors": "HIP",
  forearm: "ELBOW",
  hands: "WRIST",
  head: "HEAD",
  hair: "HEAD",
  neck: "NECK",
  chest: "CHEST",
  abs: "ABS",
  obliques: "ABS",
  serratus: "ABS",
  biceps: "ARM",
  triceps: "ARM",
  quadriceps: "THIGH",
  adductors: "THIGH",
  hamstring: "THIGH",
  calves: "SHIN",
  tibialis: "SHIN",
  ankles: "FOOT",
  feet: "FOOT",
}

export type BodyView = {
  key: "front" | "back"
  label: string
  vb: string
  /** Từng mảng theo đúng thứ tự vẽ của hình gốc: mảng chồng lên nhau (háng nằm trên đùi trong)
   *  phải giữ thứ tự đó, vẽ theo nhóm vùng thì mảng sau đè mất mảng trước. */
  shapes: { d: string; area: AreaValue }[]
  /** Theo thứ tự BODY_AREAS để thứ tự Tab trùng danh sách gốc. */
  areas: { area: BodyArea; paths: string[]; primary: boolean }[]
}

function build(key: BodyView["key"], label: string, seen: Set<AreaValue>): BodyView {
  const { vb, p } = BODY_PATHS[key]
  const [x, , w] = vb.split(" ").map(Number)
  const mid = x + w / 2
  const byArea = new Map<AreaValue, string[]>()
  const shapes: BodyView["shapes"] = []

  for (const [part, paths] of Object.entries(p)) {
    const target = PART_AREA[part]
    if (!target) continue
    for (const d of paths) {
      // Mỗi mảng cơ nằm trọn một bên trục giữa nên điểm "M x" đầu path đủ để biết bên. Mặt trước
      // người đối diện màn hình: nửa trái màn hình là bên PHẢI của họ. Mặt sau thì ngược lại.
      const screenLeft = parseFloat(d.slice(1)) < mid
      const area = typeof target === "string" ? target : target[screenLeft === (key === "front") ? "R" : "L"]
      byArea.set(area, [...(byArea.get(area) ?? []), d])
      shapes.push({ d, area })
    }
  }

  const areas = BODY_AREAS.filter((a) => byArea.has(a.value)).map((area) => {
    // Vai, khuỷu… hiện ở cả hai mặt; chỉ lần đầu là nút cho bàn phím và trình đọc màn hình.
    const primary = !seen.has(area.value)
    seen.add(area.value)
    return { area, paths: byArea.get(area.value)!, primary }
  })
  return { key, label, vb, shapes, areas }
}

const seen = new Set<AreaValue>()
export const BODY_VIEWS: BodyView[] = [build("front", "Trước", seen), build("back", "Sau", seen)]
