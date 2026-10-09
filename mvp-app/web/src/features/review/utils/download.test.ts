// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { download } from "./download"

const stream = (...parts: number[][]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      parts.forEach((p) => c.enqueue(new Uint8Array(p)))
      c.close()
    },
  })

afterEach(() => vi.unstubAllGlobals())

describe("download", () => {
  it("ghép đủ byte theo thứ tự và báo số byte tăng dần sau mỗi gói", async () => {
    vi.stubGlobal("fetch", async () => new Response(stream([1, 2], [3])))
    const seen: number[] = []
    const bytes = await download("x", new AbortController().signal, (n) => seen.push(n))
    expect([...bytes]).toEqual([1, 2, 3])
    expect(seen).toEqual([2, 3])
  })

  it("HTTP lỗi thì ném, không trả file rỗng", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }))
    await expect(download("x", new AbortController().signal, () => {})).rejects.toThrow("HTTP 503")
  })
})
