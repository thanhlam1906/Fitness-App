-- Đợt nối ProgressionEngine với dữ liệu thật. Hai việc:
-- 1) target_reps_max: scheduled_exercises trước chỉ lưu target_reps = CẬN DƯỚI
--    khoảng rep (ScheduleGenerator.toGeneratedExercises). Double progression
--    cần biết CẬN TRÊN để phân biệt "đủ để không tính trượt" (cận dưới) với
--    "đủ để thật sự tăng tải" (cận trên) — hai ngưỡng khác nhau.
-- 2) exercise_progression_state: streak (RPE thấp liên tiếp, trượt rep liên
--    tiếp, có đau lần trước) phải BỀN qua nhiều buổi — không suy ra lại được
--    từ set_logs mỗi lần tính, nên lưu riêng.

ALTER TABLE scheduled_exercises ADD COLUMN target_reps_max smallint;
UPDATE scheduled_exercises SET target_reps_max = target_reps WHERE target_reps_max IS NULL;
ALTER TABLE scheduled_exercises ALTER COLUMN target_reps_max SET NOT NULL;

CREATE TABLE exercise_progression_state (
    id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id                 uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    exercise_id                uuid NOT NULL REFERENCES exercises(id),
    consecutive_fail_streak    smallint NOT NULL DEFAULT 0,
    rpe_below_target_streak    smallint NOT NULL DEFAULT 0,
    last_pain_reported         boolean NOT NULL DEFAULT false,
    updated_at                 timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, program_id, exercise_id)
);
