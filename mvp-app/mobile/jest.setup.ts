// Module native không chạy trong jest: thay bằng bản giả đủ cho phần logic được test.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}))
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { hostUri: "10.0.0.5:8081" } } }))
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
)
