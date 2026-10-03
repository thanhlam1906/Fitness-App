/** Giới hạn của backend (spring.servlet.multipart.max-file-size = 60MB). Chặn trước cho khỏi gửi cả file rồi mới báo lỗi. */
export const MAX_PDF_BYTES = 60 * 1024 * 1024

export function splitPdfs(files: File[]): { pdfs: File[]; rejected: string[] } {
  const pdfs: File[] = []
  const rejected: string[] = []
  for (const file of files) {
    if (!/\.pdf$/i.test(file.name)) rejected.push(`${file.name}: không phải PDF, chỉ nhận file PDF.`)
    else if (file.size > MAX_PDF_BYTES) rejected.push(`${file.name}: quá 60 MB.`)
    else pdfs.push(file)
  }
  return { pdfs, rejected }
}

/** Tên hiển thị mặc định ở bước duyệt: tên file bỏ đuôi .pdf. */
export function defaultTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, "").trim()
}
