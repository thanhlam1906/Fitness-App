import { describe, expect, it } from "vitest"
import { imageFileError } from "./imageFile"

const MB = 1024 * 1024

describe("imageFileError", () => {
  it("nhận đúng loại của từng ô, tới đúng 5 MB", () => {
    expect(imageFileError("still", { type: "image/jpeg", size: 5 * MB })).toBeNull()
    expect(imageFileError("still", { type: "image/webp", size: 10 })).toBeNull()
    expect(imageFileError("animated", { type: "image/gif", size: 10 })).toBeNull()
  })

  it("sai ô thì báo loại ô đó nhận", () => {
    expect(imageFileError("still", { type: "image/gif", size: 10 })).toBe("Ảnh tĩnh chỉ nhận JPG, PNG hoặc WebP.")
    expect(imageFileError("animated", { type: "image/png", size: 10 })).toBe("Ảnh động chỉ nhận GIF hoặc WebP.")
    expect(imageFileError("still", { type: "", size: 10 })).toBe("Ảnh tĩnh chỉ nhận JPG, PNG hoặc WebP.")
  })

  it("quá 5 MB thì chặn", () => {
    expect(imageFileError("still", { type: "image/png", size: 5 * MB + 1 })).toBe("Ảnh lớn hơn 5 MB.")
  })
})
