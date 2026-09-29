import { Check } from "lucide-react"
import { DisclaimerText } from "@/components/DisclaimerText"
import { Logo } from "@/components/Logo"
import { formatDate } from "@/lib/format"
import { SettingsSubPage } from "./SettingsSubPage"
import { useProfile } from "./useProfile"

/** Cài đặt › Giới thiệu & điều khoản. Nội dung cam kết là đúng bản người dùng đã đồng ý ở onboarding. */
export function AboutPage() {
  const profile = useProfile()
  const acceptedAt = profile.data?.disclaimerAt

  return (
    <SettingsSubPage title="Giới thiệu">
      <div className="mt-5 flex items-center gap-3">
        <Logo />
        <span className="text-xs text-[var(--color-text-muted)]">Bản thử nghiệm</span>
      </div>

      {acceptedAt && (
        <p className="num mt-4 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-success-tint)] px-3 py-2.5 text-[13px] font-semibold text-[var(--color-success)]">
          <Check className="size-4 flex-none" aria-hidden />
          Bạn đã đồng ý cam kết an toàn ngày {formatDate(acceptedAt)}
        </p>
      )}

      <h2 className="kicker mt-6">Cam kết an toàn</h2>
      <div className="mt-2">
        <DisclaimerText />
      </div>
    </SettingsSubPage>
  )
}
