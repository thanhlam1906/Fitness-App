import { describe, expect, it } from "vitest"
import { defaultTitle, splitPdfs } from "./corpusFiles"

describe("splitPdfs", () => {
  it("nhận PDF theo đuôi không phân biệt hoa thường, từ chối file khác và file quá 60 MB", () => {
    const pdf = new File(["%PDF-1.7"], "Bài 4.PDF", { type: "application/pdf" })
    const docx = new File(["x"], "ghi-chu.docx")
    const big = new File(["x"], "to.pdf")
    Object.defineProperty(big, "size", { value: 61 * 1024 * 1024 })

    const { pdfs, rejected } = splitPdfs([pdf, docx, big])

    expect(pdfs).toEqual([pdf])
    expect(rejected).toEqual(["ghi-chu.docx: không phải PDF, chỉ nhận file PDF.", "to.pdf: quá 60 MB."])
  })
})

describe("defaultTitle", () => {
  it("bỏ đuôi .pdf, giữ nguyên dấu tiếng Việt", () => {
    expect(defaultTitle("Bài 4 Phục hồi và giấc ngủ.pdf")).toBe("Bài 4 Phục hồi và giấc ngủ")
    expect(defaultTitle("SCAN.PDF")).toBe("SCAN")
  })
})
