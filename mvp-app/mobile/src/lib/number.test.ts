import { cleanDecimal, parseDecimal } from "./number"

it("giữ một dấu phẩy thập phân, bỏ dấu thừa và ký tự lạ", () => {
  expect(cleanDecimal("62,5")).toBe("62,5")
  expect(cleanDecimal("62.5")).toBe("62,5")
  expect(cleanDecimal("62,,5")).toBe("62,5")
  expect(cleanDecimal("6,2,5")).toBe("6,25")
  expect(cleanDecimal("62 kg")).toBe("62")
})

it("đọc số, chuỗi rỗng hay chỉ có dấu phẩy là không có số", () => {
  expect(parseDecimal("62,5")).toBe(62.5)
  expect(parseDecimal("62,")).toBe(62)
  expect(parseDecimal("62,,5")).toBe(62.5)
  expect(parseDecimal("")).toBeNaN()
  expect(parseDecimal(",")).toBeNaN()
})
