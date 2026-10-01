// TẠM: kiểm alias sang web/src (Task 1 plan mobile). Task 3 xoá.
import { Text, View } from "react-native"
import { registerSchema } from "@/auth/registerSchema"

export default function Probe() {
  const ok = registerSchema.safeParse({}).success === false
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-lg text-accent">VFit mobile — alias web {ok ? "OK" : "LỖI"}</Text>
    </View>
  )
}
