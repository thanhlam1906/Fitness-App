import { MUSCLE_OPTIONS } from "@/lib/muscles"
import { EQUIPMENT_OPTIONS } from "@/features/profile/types"

const MUSCLE_ORDER: string[] = MUSCLE_OPTIONS.map((m) => m.value)
const EQUIPMENT_ORDER: string[] = EQUIPMENT_OPTIONS.map((e) => e.value)

/** Xếp theo thứ tự nút trên màn: lưu ra luôn cùng một thứ tự, không phụ thuộc admin bấm trước bấm sau. */
const ordered = (codes: string[], order: string[]) => order.filter((c) => codes.includes(c))

/**
 * Phần tử đầu là cơ chính (màn người tập tô nổi, gợi ý bài thay thế tìm theo nó). Cơ phụ đang được
 * chọn làm cơ chính thì rời hàng cơ phụ, để một nhóm không đứng hai chỗ.
 */
export function setPrimaryMuscle(groups: string[], code: string): string[] {
  return [code, ...ordered(groups.slice(1).filter((c) => c !== code), MUSCLE_ORDER)]
}

/** Bật/tắt một cơ phụ. Cơ chính giữ nguyên ở đầu; chưa có cơ chính thì chưa có chỗ cho cơ phụ. */
export function toggleSecondaryMuscle(groups: string[], code: string): string[] {
  const [primary, ...secondary] = groups
  if (!primary || code === primary) return groups
  const next = secondary.includes(code) ? secondary.filter((c) => c !== code) : [...secondary, code]
  return [primary, ...ordered(next, MUSCLE_ORDER)]
}

/** Bật/tắt một thiết bị; rỗng nghĩa là tập tay không. */
export function toggleEquipment(equipment: string[], code: string): string[] {
  const next = equipment.includes(code) ? equipment.filter((c) => c !== code) : [...equipment, code]
  return ordered(next, EQUIPMENT_ORDER)
}
