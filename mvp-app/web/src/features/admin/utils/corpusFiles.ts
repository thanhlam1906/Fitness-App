/** Giới hạn của backend (spring.servlet.multipart.max-file-size = 60MB). Chặn trước cho khỏi gửi cả file rồi mới báo lỗi. */
export const MAX_FILE_BYTES = 60 * 1024 * 1024

// .md đi thẳng vào Chờ duyệt, không qua máy trích PDF (backend CorpusUploadService.acceptMarkdown).
const ACCEPTED = /\.(pdf|md)$/i

export function splitFiles(files: File[]): { accepted: File[]; rejected: string[] } {
  const accepted: File[] = []
  const rejected: string[] = []
  for (const file of files) {
    if (!ACCEPTED.test(file.name)) rejected.push(`${file.name}: chỉ nhận file PDF hoặc Markdown (.md).`)
    else if (file.size > MAX_FILE_BYTES) rejected.push(`${file.name}: quá 60 MB.`)
    else accepted.push(file)
  }
  return { accepted, rejected }
}

/** Tên hiển thị mặc định ở bước duyệt: tên file bỏ đuôi .pdf hoặc .md. */
export function defaultTitle(fileName: string): string {
  return fileName.replace(ACCEPTED, "").trim()
}
