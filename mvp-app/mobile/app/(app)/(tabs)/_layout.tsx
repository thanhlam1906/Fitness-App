import { Tabs } from "expo-router"
import { CalendarDays, Camera, Settings } from "lucide-react-native"
import { AssistantTabIcon } from "~/components/AssistantMark"
import { colors } from "~/theme"

// Cùng thứ tự, nhãn, icon với UserShell của web. Nhãn tối đa 2 chữ để 4 tab vừa một hàng;
// icon gánh phần nhận diện, chữ chỉ để khỏi phải đoán icon.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors["text-muted"],
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="schedule"
        options={{ title: "Lịch", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: "Trợ lý", tabBarIcon: ({ color, size }) => <AssistantTabIcon color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="form-check"
        options={{ title: "Chấm form", tabBarIcon: ({ color, size }) => <Camera color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Cài đặt", tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
      />
    </Tabs>
  )
}
