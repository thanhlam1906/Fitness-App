/** Tải một file, báo số byte đã nhận sau mỗi gói: MediaPipe tự tải thì không báo tiến độ cho thanh chờ. */
export async function download(
  url: string,
  signal: AbortSignal,
  onBytes: (received: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(url, { signal })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    chunks.push(part.value)
    received += part.value.length
    onBytes(received)
  }
  const all = new Uint8Array(received)
  let at = 0
  for (const chunk of chunks) {
    all.set(chunk, at)
    at += chunk.length
  }
  return all
}
