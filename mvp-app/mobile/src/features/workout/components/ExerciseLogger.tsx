import { useEffect, useState } from "react"
import { Image, Pressable, Text, TextInput, View } from "react-native"
import { Shuffle } from "lucide-react-native"
import type { ScheduledExerciseView } from "@/features/schedule/types"
import { SKIP_REASONS, type SetLogResponse } from "@/features/workout/types"
import { cn } from "@/lib/cn"
import { exerciseImageUrl } from "@/lib/exerciseImage"
import { formatKg } from "@/lib/format"
import { ExerciseImage } from "~/components/ExerciseImage"
import { LoadDeltaBadge } from "~/components/LoadDeltaBadge"
import { Button } from "~/components/ui/Button"
import { Skeleton } from "~/components/ui/Skeleton"
import { IconText } from "~/components/StatusViews"
import { Kicker } from "~/components/Kicker"
import { WrongFeedbackButton } from "~/features/feedback/components/WrongFeedbackButton"
import { useLogSet, useSubstitute, useSubstitutes } from "~/features/workout/api/useWorkoutSession"
import { API_URL } from "~/lib/config"
import { cleanDecimal, parseDecimal } from "~/lib/number"
import { colors } from "~/theme"

const NUM = { fontVariant: ["tabular-nums" as const] }

/**
 * Log rep/tải từng set, RPE hỏi mềm ở set cuối bài, bỏ set kèm lý do, thay bài khi thiếu thiết bị
 * — bản mobile của ExerciseLogger web. SỐ TẢI là nội dung chính (64px), liếc một cái là thấy khi
 * đang cầm tạ. Chỉ set đang làm mới mở thành thẻ có nút bấm; còn lại thu thành một dòng.
 */
export function ExerciseLogger({
  exercise,
  scheduledWorkoutId,
  sessionId,
  loggedSets,
}: {
  exercise: ScheduledExerciseView
  scheduledWorkoutId: string
  sessionId: string
  loggedSets: SetLogResponse[]
}) {
  const setIndexes = Array.from({ length: exercise.targetSets }, (_, i) => i + 1)
  // Set đang làm = set đầu tiên chưa log. Xong hết thì không set nào nổi lên.
  const activeSetIndex = setIndexes.find((i) => !loggedSets.some((s) => s.setIndex === i))

  return (
    <View>
      <Text className="mt-5 text-[22px] font-bold text-text">{exercise.exerciseName}</Text>
      {exercise.substitutedFromName && (
        <Text className="mt-1 text-xs text-text-muted">thay cho {exercise.substitutedFromName}</Text>
      )}

      <CoachingPanel exercise={exercise} />

      <View className="mt-1.5 flex-row items-end gap-2.5">
        <Text className="text-[64px] font-extrabold leading-[64px] tracking-[-2px] text-text" style={NUM}>
          {exercise.targetLoadKg == null ? "—" : formatKg(exercise.targetLoadKg).replace(" kg", "")}
        </Text>
        <Text className="pb-2 text-xl font-semibold text-text-muted" style={NUM}>
          kg × {exercise.targetReps}
          {exercise.targetRepsMax > exercise.targetReps && `–${exercise.targetRepsMax}`} rep
        </Text>
      </View>

      {exercise.loadDecision && (
        <View className="mt-2 gap-1">
          <View className="flex-row items-baseline gap-2">
            <LoadDeltaBadge decision={exercise.loadDecision} />
            <Text className="flex-1 text-xs text-text-muted">{exercise.loadDecision.messageVi}</Text>
          </View>
          {/* Bất biến: mọi góp ý do máy sinh ra có nút "cái này sai" — kể cả lý do đổi tải giữa buổi. */}
          <WrongFeedbackButton source={{ loadDecisionId: exercise.loadDecision.id }} />
        </View>
      )}

      <View className="mt-6 gap-2">
        {setIndexes.map((setIndex) => {
          const logged = loggedSets.find((s) => s.setIndex === setIndex)
          return setIndex === activeSetIndex ? (
            <ActiveSet
              key={setIndex}
              scheduledWorkoutId={scheduledWorkoutId}
              sessionId={sessionId}
              exerciseId={exercise.exerciseId}
              setIndex={setIndex}
              isLastSet={setIndex === exercise.targetSets}
              targetReps={exercise.targetRepsMax}
              defaultLoadKg={exercise.targetLoadKg}
              restSeconds={exercise.restSeconds}
            />
          ) : (
            <SetSummaryRow
              key={setIndex}
              setIndex={setIndex}
              logged={logged}
              targetReps={exercise.targetReps}
              targetLoadKg={exercise.targetLoadKg}
            />
          )
        })}
      </View>

      <SubstitutePanel exercise={exercise} />
    </View>
  )
}

/** Set đã xong hoặc chưa tới — một dòng, không nút. */
function SetSummaryRow({
  setIndex,
  logged,
  targetReps,
  targetLoadKg,
}: {
  setIndex: number
  logged: SetLogResponse | undefined
  targetReps: number
  targetLoadKg: number | null
}) {
  const done = logged != null
  return (
    <View className="flex-row items-center gap-3 rounded-md bg-surface px-3.5 py-3">
      <Text className="w-11 text-[11px] tracking-[0.9px] text-text-muted">SET {setIndex}</Text>
      <Text className={cn("flex-1 text-sm", done ? "text-text" : "text-text-muted")} style={NUM}>
        {logged?.skipped
          ? `bỏ set · ${SKIP_REASONS.find((r) => r.value === logged.skipReason)?.label ?? "khác"}`
          : `${logged?.reps ?? targetReps} rep · ${formatKg(logged?.loadKg ?? targetLoadKg)}`}
      </Text>
      {done ? (
        <Text className="text-sm text-success" style={NUM}>
          {logged!.rpe != null ? `RPE ${logged!.rpe} ` : ""}✓
        </Text>
      ) : (
        <Text className="text-sm text-text-muted">—</Text>
      )}
    </View>
  )
}

function ActiveSet({
  scheduledWorkoutId,
  sessionId,
  exerciseId,
  setIndex,
  isLastSet,
  targetReps,
  defaultLoadKg,
  restSeconds,
}: {
  scheduledWorkoutId: string
  sessionId: string
  exerciseId: string
  setIndex: number
  isLastSet: boolean
  targetReps: number
  defaultLoadKg: number | null
  restSeconds: number | null
}) {
  const logSet = useLogSet(scheduledWorkoutId, sessionId)
  const [reps, setReps] = useState(targetReps)
  const [loadKg, setLoadKg] = useState(defaultLoadKg ?? 0)
  const [rpe, setRpe] = useState("")
  const [skipping, setSkipping] = useState(false)
  const [skipReason, setSkipReason] = useState<string>("TIRED")

  function save() {
    const rpeValue = Number(rpe)
    logSet.mutate({
      exerciseId,
      setIndex,
      targetReps,
      reps: skipping ? null : reps,
      loadKg: skipping ? null : loadKg,
      rpe: isLastSet && rpe !== "" && !Number.isNaN(rpeValue) ? rpeValue : null,
      skipped: skipping,
      skipReason: skipping ? skipReason : null,
    })
  }

  return (
    <View className="rounded-xl border border-border bg-surface-2 p-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[1.1px] text-accent">Set {setIndex} — đang làm</Text>
        {restSeconds != null && (
          <Text className="text-xs text-text-muted" style={NUM}>
            nghỉ {formatRest(restSeconds)}
          </Text>
        )}
      </View>

      {skipping ? (
        <View className="mt-3.5">
          <Kicker>Lý do bỏ set</Kicker>
          {/* Web dùng <select>; 4 lựa chọn thì bấm một lần nhanh hơn mở danh sách. */}
          <View accessibilityRole="radiogroup" className="mt-1.5 flex-row flex-wrap gap-2">
            {SKIP_REASONS.map((r) => {
              const on = skipReason === r.value
              return (
                <Pressable
                  key={r.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => setSkipReason(r.value)}
                  className={cn("h-10 justify-center rounded-full border px-3.5", on ? "border-accent bg-surface" : "border-border bg-surface")}
                >
                  <Text className={cn("text-sm", on ? "font-semibold text-text" : "text-text-muted")}>{r.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      ) : (
        <>
          <View className="mt-3.5 flex-row gap-[18px]">
            <NumberStepper label="Rep" value={reps} step={1} min={0} onChange={setReps} />
            <NumberStepper label="Tải (kg)" value={loadKg} step={2.5} min={0} decimal onChange={setLoadKg} />
          </View>
          {isLastSet && (
            // RPE hỏi mềm: bỏ trống được, thiếu thì bài này chỉ chạy double progression.
            <View className="mt-3.5">
              <Kicker>RPE set cuối — bỏ qua được</Kicker>
              <TextInput
                accessibilityLabel="RPE set cuối"
                keyboardType="number-pad"
                maxLength={2}
                placeholder="—"
                placeholderTextColor={colors["text-muted"]}
                className="mt-1.5 h-11 w-20 rounded-md border border-border bg-surface px-3 text-center text-base text-text"
                style={NUM}
                value={rpe}
                onChangeText={(t) => setRpe(t.replace(/\D/g, ""))}
              />
            </View>
          )}
        </>
      )}

      <Button className="mt-4 w-full" onPress={save} disabled={logSet.isPending}>
        {logSet.isPending ? "Đang lưu…" : `Lưu set ${setIndex}`}
      </Button>

      <View className="mt-2.5 flex-row items-center justify-between">
        <Pressable accessibilityRole="button" onPress={() => setSkipping((s) => !s)} hitSlop={8}>
          <Text className="text-xs text-text-muted">{skipping ? "Không bỏ nữa" : "Bỏ set này"}</Text>
        </Pressable>
        <Text className="text-[11px] text-text-muted">lưu lên server sau mỗi set</Text>
      </View>
      {logSet.isError && (
        <IconText small className="mt-2">
          {logSet.error.message}
        </IconText>
      )}
    </View>
  )
}

const showNumber = (v: number) => String(v).replace(".", ",")

/**
 * Nút − / + cỡ 44pt cộng ô số gõ được: giữa buổi thì bấm dễ hơn gõ, nhưng tạ lẻ (1,25 kg mỗi bên)
 * vẫn phải nhập tay được. Ô giữ chữ đang gõ riêng: gõ "62," mà ép ngay thành số thì mất dấu phẩy,
 * không gõ tiếp phần lẻ được.
 */
function NumberStepper({
  label,
  value,
  step,
  min,
  decimal,
  onChange,
}: {
  label: string
  value: number
  step: number
  min: number
  decimal?: boolean
  onChange: (value: number) => void
}) {
  const [text, setText] = useState(showNumber(value))
  // Nút −/+ đổi số từ ngoài ô: viết lại chữ cho khớp. Gõ tay thì số đã khớp chữ, không viết lại.
  useEffect(() => {
    setText((t) => {
      const typed = parseDecimal(t)
      return (Number.isNaN(typed) ? min : typed) === value ? t : showNumber(value)
    })
  }, [value, min])

  function bump(delta: number) {
    onChange(Math.max(min, Math.round((value + delta) * 100) / 100))
  }

  return (
    <View className="flex-1">
      <Kicker>{label}</Kicker>
      <View className="mt-1.5 flex-row items-center gap-2.5">
        <StepButton label={`Giảm ${label}`} onPress={() => bump(-step)}>
          −
        </StepButton>
        <TextInput
          accessibilityLabel={label}
          keyboardType={decimal ? "decimal-pad" : "number-pad"}
          selectTextOnFocus
          className="min-w-0 flex-1 text-center text-[26px] font-bold text-text"
          style={NUM}
          value={text}
          onChangeText={(t) => {
            const clean = decimal ? cleanDecimal(t) : t.replace(/\D/g, "")
            setText(clean)
            const n = parseDecimal(clean)
            // Ô trống là 0 như ô number của web: bấm "Lưu set" lúc đó không được lưu số cũ đang ẩn.
            onChange(Math.max(min, Number.isNaN(n) ? min : n))
          }}
          onBlur={() => setText(showNumber(value))}
        />
        <StepButton label={`Tăng ${label}`} onPress={() => bump(step)}>
          +
        </StepButton>
      </View>
    </View>
  )
}

function StepButton({ label, onPress, children }: { label: string; onPress: () => void; children: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-md border border-border bg-surface active:border-text-muted"
    >
      <Text className="text-xl text-text">{children}</Text>
    </Pressable>
  )
}

function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = `${seconds % 60}`.padStart(2, "0")
  return `${m}:${s}`
}

/**
 * Ảnh + mô tả cách tập PHẢI mặc định đóng: mở sẵn là đẩy ảnh lên trên con số 64px mà design cố
 * tình phóng to. Nút chỉ hiện khi mở ra có gì để xem — dò ảnh trước bằng Image.prefetch.
 */
function CoachingPanel({ exercise }: { exercise: ScheduledExerciseView }) {
  const [open, setOpen] = useState(false)
  const hasDescription = !!exercise.description
  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    let alive = true
    Image.prefetch(`${API_URL}${exerciseImageUrl(exercise.exerciseSlug, "still")}`)
      .then((ok) => alive && setHasImage(ok))
      .catch(() => alive && setHasImage(false))
    return () => {
      alive = false
    }
  }, [exercise.exerciseSlug])

  if (!hasDescription && !hasImage) return null

  return (
    <View className="mt-2">
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} hitSlop={8}>
        <Text className="text-xs text-text-muted">{open ? "Ẩn cách tập" : "Xem cách tập"}</Text>
      </Pressable>
      {open && (
        <View className="mt-2.5">
          <ExerciseImage slug={exercise.exerciseSlug} alt={exercise.exerciseName} variant="large" />
          {hasDescription && <Text className="mt-2 text-xs leading-5 text-text-muted">{exercise.description}</Text>}
        </View>
      )}
    </View>
  )
}

/** §5.5 — người dùng báo thiếu thiết bị, hệ thống đề xuất, NGƯỜI DÙNG xác nhận rồi mới đổi. */
function SubstitutePanel({ exercise }: { exercise: ScheduledExerciseView }) {
  const [open, setOpen] = useState(false)
  const suggestions = useSubstitutes(open ? exercise.exerciseId : null)
  const substitute = useSubstitute()

  if (!open) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} className="mt-3 self-start" hitSlop={8}>
        <Text className="text-xs text-text-muted">Thiếu thiết bị, đổi bài khác</Text>
      </Pressable>
    )
  }

  return (
    <View className="mt-3 gap-2 rounded-md bg-surface p-3">
      <Text className="text-xs leading-5 text-text-muted">
        Bài cùng nhóm cơ, lọc theo thiết bị bạn đang có. Set và rep giữ nguyên; tải cần nhập lại.
      </Text>
      {suggestions.isLoading && (
        // Khung của hàng nút bài gợi ý.
        <View accessible accessibilityLabel="Đang tải" className="flex-row flex-wrap gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </View>
      )}
      {suggestions.data?.length === 0 && (
        <IconText icon={Shuffle} tone="muted" small>
          Không có bài thay thế hợp thiết bị của bạn
        </IconText>
      )}
      <View className="flex-row flex-wrap gap-2">
        {suggestions.data?.map((s) => (
          <Button
            key={s.id}
            variant="secondary"
            size="sm"
            disabled={substitute.isPending}
            onPress={() =>
              substitute.mutate({ scheduledExerciseId: exercise.id, exerciseId: s.id }, { onSuccess: () => setOpen(false) })
            }
          >
            {s.nameVi ?? s.nameEn}
          </Button>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(false)} className="self-start" hitSlop={8}>
        <Text className="text-xs text-text-muted">Huỷ</Text>
      </Pressable>
      {substitute.isError && <IconText small>{substitute.error.message}</IconText>}
    </View>
  )
}
