import { expect, it } from "vitest"
import {
  applyListPatch,
  DEFAULT_USER_LIST_PARAMS,
  nextSort,
  readUserListParams,
  toUsersApiQuery,
  writeUserListParams,
} from "./userListParams"

it("URL trống → mặc định; giá trị lạ bị bỏ, không làm hỏng trang", () => {
  expect(readUserListParams(new URLSearchParams())).toEqual(DEFAULT_USER_LIST_PARAMS)
  expect(readUserListParams(new URLSearchParams("status=WHATEVER&sort=password&page=-3&role=ROOT&dir=up"))).toEqual(
    DEFAULT_USER_LIST_PARAMS,
  )
})

it("đọc và ghi lại đúng; giá trị mặc định không nằm trên URL", () => {
  const sp = new URLSearchParams("q=an&status=IDLE&role=USER&sort=email&dir=asc&page=2")
  const p = readUserListParams(sp)
  expect(p).toEqual({ q: "an", status: "IDLE", role: "USER", sort: "email", dir: "asc", page: 2 })
  expect(writeUserListParams(p).toString()).toBe(sp.toString())
  expect(writeUserListParams(DEFAULT_USER_LIST_PARAMS).toString()).toBe("")
})

it("query gửi API có size; bản xuất CSV không phân trang", () => {
  const p = { ...DEFAULT_USER_LIST_PARAMS, q: "a b", page: 1 }
  expect(toUsersApiQuery(p)).toBe("q=a+b&status=ALL&role=ALL&sort=createdAt&dir=desc&page=1&size=20")
  expect(toUsersApiQuery(p, false)).toBe("q=a+b&status=ALL&role=ALL&sort=createdAt&dir=desc")
})

it("bấm cùng cột thì đảo chiều, cột mới thì giảm dần (email thì tăng dần)", () => {
  const p = DEFAULT_USER_LIST_PARAMS
  expect(nextSort(p, "createdAt")).toEqual({ sort: "createdAt", dir: "asc" })
  expect(nextSort(p, "sessionCount")).toEqual({ sort: "sessionCount", dir: "desc" })
  expect(nextSort(p, "email")).toEqual({ sort: "email", dir: "asc" })
})

it("áp patch lên URL hiện tại: patch q không làm mất tab vừa đổi, và về trang đầu", () => {
  const current = new URLSearchParams("status=IDLE&role=USER&page=3")
  expect(applyListPatch(current, { q: "an" }).toString()).toBe("q=an&status=IDLE&role=USER")
  expect(applyListPatch(current, { page: 2 }).toString()).toBe("status=IDLE&role=USER&page=2")
})
