import { describe, expect, it } from "vitest"
import { defaultTitle, splitFiles } from "./corpusFiles"

describe("splitFiles", () => {
  it("nhận PDF và .md theo đuôi không phân biệt hoa thường, từ chối file khác và file quá 60 MB", () => {
    const pdf = new File(["%PDF-1.7"], "Bài 4.PDF", { type: "application/pdf" })
    const md = new File(["## Giấc ngủ"], "Bài 5.MD")
    const docx = new File(["x"], "ghi-chu.docx")
    const big = new File(["x"], "to.pdf")
    Object.defineProperty(big, "size", { value: 61 * 1024 * 1024 })

    const { accepted, rejected } = splitFiles([pdf, md, docx, big])

    expect(accepted).toEqual([pdf, md])
    expect(rejected).toEqual(["ghi-chu.docx: chỉ nhận file PDF hoặc Markdown (.md).", "to.pdf: quá 60 MB."])
  })
})

describe("defaultTitle", () => {
  it("bỏ đuôi .pdf hoặc .md, giữ nguyên dấu tiếng Việt", () => {
    expect(defaultTitle("Bài 4 Phục hồi và giấc ngủ.pdf")).toBe("Bài 4 Phục hồi và giấc ngủ")
    expect(defaultTitle("SCAN.PDF")).toBe("SCAN")
    expect(defaultTitle("chấn thương.md")).toBe("chấn thương")
  })
})
