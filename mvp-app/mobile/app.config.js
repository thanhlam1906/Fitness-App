// Mở rộng app.json bằng hai plugin cần giá trị lúc build. Client token Facebook không ghi vào git (repo công khai):
// EAS đọc biến môi trường FACEBOOK_CLIENT_TOKEN khai báo trên expo.dev.
const FACEBOOK_APP_ID = "1796918432442341"

module.exports = ({ config }) => {
  const clientToken = process.env.FACEBOOK_CLIENT_TOKEN
  // Build APK thiếu token thì nút Facebook hỏng âm thầm trên máy người dùng: dừng build ngay cho dễ thấy.
  if (process.env.EAS_BUILD && !clientToken) {
    throw new Error("Thiếu FACEBOOK_CLIENT_TOKEN trong Environment variables của project trên expo.dev")
  }
  return {
    ...config,
    plugins: [
      ...config.plugins,
      // Plugin bắt khai iosUrlScheme khi không dùng Firebase. iPhone chưa làm đăng nhập Google (chưa có client iOS),
      // giá trị này chỉ để qua bước kiểm; Android không đọc nó.
      ["@react-native-google-signin/google-signin", { iosUrlScheme: "com.googleusercontent.apps.1096647112849-ios-chua-co" }],
      [
        "react-native-fbsdk-next",
        {
          appID: FACEBOOK_APP_ID,
          clientToken: clientToken ?? "",
          displayName: "VFit",
          scheme: `fb${FACEBOOK_APP_ID}`,
          isAutoInitEnabled: true,
          // Không gửi sự kiện dùng app hay mã quảng cáo cho Facebook: app chỉ cần nút đăng nhập.
          autoLogAppEventsEnabled: false,
          advertiserIDCollectionEnabled: false,
        },
      ],
    ],
  }
}
