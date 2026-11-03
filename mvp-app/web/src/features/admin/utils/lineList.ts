/** Danh sách chuỗi → nội dung ô nhiều dòng, mỗi phần tử một dòng. */
export function toLines(list: string[]): string {
  return list.join("\n")
}

/**
 * Ô nhiều dòng → danh sách: cắt khoảng trắng mỗi dòng, bỏ dòng trống. Backend cũng làm vậy, nhưng làm ở đây
 * để ô gõ xong rồi lưu thì không còn dòng trống nào trong dữ liệu gửi đi.
 */
export function fromLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
}
