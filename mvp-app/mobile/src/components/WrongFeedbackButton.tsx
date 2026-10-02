import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { useMutation } from "@tanstack/react-query"
import { api } from "~/api/client"
import { Input } from "~/components/ui/Input"

type Source = { reviewResultId: string } | { loadDecisionId: string } | { assistantMessageId: string }

/**
 * Nút "góp ý này sai" ở MỌI góp ý do máy sinh ra (bất biến sản phẩm) — kết quả chấm form, quyết
 * định tải, câu trả lời trợ lý. Một component thì không sót chỗ nào. Chữ mờ cỡ nhỏ, cố tình không
 * nổi: nó là lối thoát khi máy sai, không phải hành động app muốn người dùng làm. Như bản web.
 */
export function WrongFeedbackButton({ source, hint }: { source: Source; hint?: string }) {
  const [note, setNote] = useState("")
  const [open, setOpen] = useState(false)

  const send = useMutation({
    mutationFn: () => api.post("/feedback", { ...source, isWrong: true, note: note || null }),
  })

  if (send.isSuccess) {
    return <Text className="text-xs text-text-muted">Đã ghi nhận. Cảm ơn bạn.</Text>
  }

  if (!open) {
    return (
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8}>
          <Text className="text-xs text-text-muted underline">Góp ý này sai?</Text>
        </Pressable>
        {hint && <Text className="text-[11px] text-text-muted">{hint}</Text>}
      </View>
    )
  }

  return (
    <View className="gap-2">
      <Input
        accessibilityLabel="Vì sao góp ý này sai"
        placeholder="Sai ở chỗ nào? (tuỳ chọn)"
        value={note}
        onChangeText={setNote}
        className="h-9 text-xs"
      />
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => send.mutate()}
          disabled={send.isPending}
          className={`h-9 justify-center rounded-sm border border-border px-3 ${send.isPending ? "opacity-50" : ""}`}
        >
          <Text className="text-xs text-text">{send.isPending ? "Đang gửi…" : "Gửi"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} hitSlop={8}>
          <Text className="text-xs text-text-muted">Huỷ</Text>
        </Pressable>
        {send.isError && <Text className="text-xs text-danger">Gửi thất bại.</Text>}
      </View>
    </View>
  )
}
