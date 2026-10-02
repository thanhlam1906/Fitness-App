import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import { useFocusEffect } from "expo-router"

/**
 * Màn tab trên điện thoại không dựng lại khi quay về — khác trang web, chuyển trang là dựng lại và
 * tải lại (code-reviewer 10-02 #1). Quay lại tab thì tải lại; bỏ qua lần đầu vì query vừa tải xong.
 * Giữ refetch trong ref: hàm mới mỗi lần render không làm effect chạy lại liên tục.
 */
export function useRefreshOnFocus(refetch: () => unknown) {
  const first = useRef(true)
  const latest = useRef(refetch)
  latest.current = refetch
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false
        return
      }
      latest.current()
    }, []),
  )
}

/**
 * iOS treo app chứ không tắt: mở lại sáng hôm sau thì "hôm nay" vẫn là hôm qua nếu màn không dựng
 * lại (dữ liệu tải lại giống hệt thì React không render). Sang ngày mới thì gọi `onNewDay` (màn Lịch
 * bỏ ngày đang chọn) rồi dựng lại; cùng ngày thì giữ nguyên lựa chọn của người dùng.
 */
export function useNewDayOnResume(onNewDay: () => void) {
  const [, setTick] = useState(0)
  const latest = useRef(onNewDay)
  latest.current = onNewDay
  useEffect(() => {
    let day = new Date().toDateString()
    const sub = AppState.addEventListener("change", (state) => {
      const now = new Date().toDateString()
      if (state !== "active" || now === day) return
      day = now
      latest.current()
      setTick((t) => t + 1)
    })
    return () => sub.remove()
  }, [])
}
