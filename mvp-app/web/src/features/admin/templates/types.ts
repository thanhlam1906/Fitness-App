export type ProgramTemplate = {
  id: string
  slug: string
  name: string
  methodology: string | null
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  weekStructure: string // JSON thô — [{order,label,exercises:[...]}], xem F4
  progression: string // JSON thô — {mode,target_rpe,increment_kg}
  active: boolean
}

export type ProgramTemplateInput = {
  slug?: string // bắt buộc khi tạo, bỏ qua khi sửa
  name: string
  methodology: string
  sessionsMin: number
  sessionsMax: number
  requiredEquipment: string[]
  weekStructure: string
  progression: string
  active: boolean
}
