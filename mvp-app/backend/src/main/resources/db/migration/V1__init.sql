-- Schema khởi tạo. Nguồn: concept-backend-v1.md §4.
-- Không sửa file này sau khi đã chạy ở môi trường nào — Flyway versioned migration
-- là bất biến. Thay đổi schema sau này thì thêm V2__..., V3__... mới.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- email không phân biệt hoa thường

-- ══════════════════════ Định danh và hồ sơ ══════════════════════

CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email          citext      NOT NULL UNIQUE,
    password_hash  text        NOT NULL,             -- BCrypt cost 10
    role           text        NOT NULL DEFAULT 'USER'
                   CHECK (role IN ('USER','ADMIN')),
    is_active      boolean     NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Bật khi phát hành cho 100 tester. Trước đó bỏ trống, đăng ký tự do.
CREATE TABLE invite_codes (
    code        text PRIMARY KEY,
    used_by     uuid REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    used_at     timestamptz
);

CREATE TABLE profiles (
    user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    goal               text CHECK (goal IN ('MUSCLE','STRENGTH','FAT_LOSS','GENERAL')),
    experience         text CHECK (experience IN ('NEW','LT_1Y','1_3Y','GT_3Y')),
    sessions_per_week  smallint CHECK (sessions_per_week BETWEEN 2 AND 6),
    equipment          text[]      NOT NULL DEFAULT '{}',  -- BARBELL_RACK, DUMBBELL, KETTLEBELL, BENCH
    birth_year         smallint,
    gender             text,                               -- tuỳ chọn, A3
    disclaimer_at      timestamptz,                        -- A2, bắt buộc trước khi tạo chương trình
    onboarding_step    text        NOT NULL DEFAULT 'DISCLAIMER',  -- bỏ dở rồi quay lại tiếp được
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE body_metrics (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    height_cm    numeric(5,1),
    weight_kg    numeric(5,2),
    measured_on  date        NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, measured_on)
);
CREATE INDEX ON body_metrics (user_id, measured_on DESC);

-- ══════════════════════ Nội dung — admin và HLV sửa ══════════════════════

CREATE TABLE exercises (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           text NOT NULL UNIQUE,              -- 'barbell-back-squat'
    name_en        text NOT NULL,                     -- giữ tiếng Anh chuẩn
    name_vi        text,
    muscle_groups  text[] NOT NULL DEFAULT '{}',      -- dùng cho bài thay thế
    equipment      text[] NOT NULL DEFAULT '{}',
    description    text,
    filming_guide  jsonb,                             -- góc, khoảng cách, ánh sáng, ảnh minh hoạ
    analyzable     boolean NOT NULL DEFAULT false,    -- true cho các bài của TN2
    is_active      boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON exercises USING gin (muscle_groups);

-- P7: NGƯỠNG + TEXT + GÓC HỢP LỆ ở đây. CÔNG THỨC ĐO ở code analyzer.
-- Bảng này là kênh chỉnh ngưỡng. Sửa xong là có hiệu lực, không deploy.
CREATE TABLE form_checks (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id       uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    code              text NOT NULL,          -- 'squat_depth' — analyzer map sang hàm đo
    metric            text NOT NULL,          -- 'hip_depth_ratio' — tên đại lượng, code tính
    valid_viewpoints  text[] NOT NULL,        -- {'SAGITTAL'} | {'FRONTAL'} | cả hai
    thresholds        jsonb NOT NULL,         -- {"pass_below": 1.10, "warn_below": 1.30}
    confidence_min    numeric(3,2) NOT NULL DEFAULT 0.70,  -- dưới ngưỡng → 'chưa đủ tin cậy'
    -- BA mức text: analyzer chấm ra pass / warn / fail, mỗi mức một lời góp ý riêng.
    cue_pass_vi       text,
    cue_warn_vi       text,
    cue_fail_vi       text NOT NULL,
    priority          smallint NOT NULL,      -- 1 = nêu trước. Mỗi lần chỉ nêu MỘT lỗi
    is_active         boolean NOT NULL DEFAULT true,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (exercise_id, code)
);

CREATE TABLE program_templates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                text NOT NULL UNIQUE,          -- 'gzclp', 'full-body-3x'
    name                text NOT NULL,
    methodology         text,                          -- mô tả cho màn chọn chương trình
    sessions_min        smallint NOT NULL,
    sessions_max        smallint NOT NULL,
    required_equipment  text[] NOT NULL DEFAULT '{}',  -- dùng cho ma trận đề xuất
    -- order = vị trí trong chu kỳ, KHÔNG phải thứ trong tuần (user tự chọn ngày nghỉ)
    week_structure      jsonb NOT NULL,   -- [{order,label,exercises:[{slug,sets,reps_min,reps_max,rest_sec}]}]
    -- increment theo BÀI, không theo loại thiết bị
    progression         jsonb NOT NULL,   -- {"mode":"LINEAR|DOUBLE","target_rpe":8,"increment_kg":{"<slug>":2.5}}
    is_active           boolean NOT NULL DEFAULT true,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════ Khối B — chương trình, lịch, log, TN1 ══════════════════════

CREATE TABLE programs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id  uuid NOT NULL REFERENCES program_templates(id),
    params       jsonb NOT NULL,                     -- mức tạ khởi điểm từng bài
    rest_days    smallint[] NOT NULL DEFAULT '{}',   -- 1=T2 … 7=CN
    start_date   date NOT NULL,
    status       text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
    created_at   timestamptz NOT NULL DEFAULT now()
);
-- Đổi chương trình bất cứ lúc nào, lịch sử cũ giữ nguyên. Chỉ 1 chương trình đang chạy.
CREATE UNIQUE INDEX one_active_program_per_user
    ON programs (user_id) WHERE status = 'ACTIVE';

CREATE TABLE scheduled_workouts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id    uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    scheduled_on  date NOT NULL,
    week_index    smallint NOT NULL,
    label         text,                  -- "Buổi A"
    status        text NOT NULL DEFAULT 'PLANNED'
                  CHECK (status IN ('PLANNED','DONE','SKIPPED','MISSED')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (program_id, scheduled_on)
);
CREATE INDEX ON scheduled_workouts (program_id, scheduled_on);

CREATE TABLE scheduled_exercises (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_workout_id  uuid NOT NULL REFERENCES scheduled_workouts(id) ON DELETE CASCADE,
    exercise_id           uuid NOT NULL REFERENCES exercises(id),
    order_index           smallint NOT NULL,
    target_sets           smallint NOT NULL,
    target_reps           smallint NOT NULL,
    target_load_kg        numeric(6,2),
    rest_seconds          smallint,
    substituted_from      uuid REFERENCES exercises(id),   -- giữ vết bài gốc khi thay thế
    UNIQUE (scheduled_workout_id, order_index)
);

CREATE TABLE workout_sessions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_workout_id  uuid REFERENCES scheduled_workouts(id),  -- NULL = tập ngoài lịch
    started_at            timestamptz NOT NULL DEFAULT now(),
    finished_at           timestamptz,
    status                text NOT NULL DEFAULT 'IN_PROGRESS'
                          CHECK (status IN ('IN_PROGRESS','DONE','ABANDONED'))
);
CREATE INDEX ON workout_sessions (user_id, started_at DESC);

CREATE TABLE set_logs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id  uuid NOT NULL REFERENCES exercises(id),
    set_index    smallint NOT NULL,
    target_reps  smallint,
    reps         smallint,
    load_kg      numeric(6,2),
    rpe          smallint CHECK (rpe BETWEEN 1 AND 10),   -- NULL hợp lệ: RPE hỏi mềm
    skipped      boolean NOT NULL DEFAULT false,
    skip_reason  text CHECK (skip_reason IN ('TIRED','NO_EQUIPMENT','PAIN','OTHER')),
    logged_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, exercise_id, set_index)
);
CREATE INDEX ON set_logs (exercise_id, logged_at DESC);

CREATE TABLE pain_reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    body_area   text NOT NULL,       -- 'KNEE_L', 'LOWER_BACK'
    severity    smallint NOT NULL CHECK (severity BETWEEN 1 AND 5),
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON pain_reports (session_id);

-- BẮT BUỘC LOG. Mọi thay đổi tải phải có dòng ở đây, kèm lý do CẤU TRÚC.
CREATE TABLE load_decisions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id      uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    exercise_id     uuid NOT NULL REFERENCES exercises(id),
    effective_from  date NOT NULL,
    direction       text NOT NULL CHECK (direction IN ('UP','HOLD','DOWN','SUBSTITUTE')),
    delta_kg        numeric(6,2),
    rule_id         text NOT NULL,    -- 'DOUBLE_PROGRESSION_ALL_REPS_MET'
    rule_params     jsonb NOT NULL,   -- {"sets_met":5,"sets_total":5,"increment":2.5}
    message_vi      text NOT NULL,    -- "Đủ rep mọi set tuần trước → +2.5 kg"
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON load_decisions (user_id, effective_from DESC);

-- ══════════════════════ Khối C — hàng đợi video, TN2 ══════════════════════

CREATE TABLE video_review_requests (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id    uuid NOT NULL REFERENCES exercises(id),
    status         text NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED','REJECTED')),
    reject_reason  text,              -- 'BAD_VIEWPOINT', 'LOW_VISIBILITY'
    error          text,
    attempts       smallint NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    started_at     timestamptz,
    finished_at    timestamptz
);
-- Index của hàng đợi. Partial nên nó nhỏ mãi mãi dù bảng lớn dần.
CREATE INDEX pending_queue ON video_review_requests (created_at)
    WHERE status = 'PENDING';
CREATE INDEX ON video_review_requests (user_id, created_at DESC);

CREATE TABLE video_clips (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id   uuid NOT NULL REFERENCES video_review_requests(id) ON DELETE CASCADE,
    storage_key  text NOT NULL,       -- 'clips/2026/09/<uuid>.mp4'
    viewpoint    text,                -- người dùng khai, analyzer xác nhận lại
    duration_ms  integer,
    size_bytes   bigint,
    uploaded_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at   timestamptz          -- N2: set NGAY sau khi chấm xong
);
CREATE INDEX undeleted_clips ON video_clips (uploaded_at)
    WHERE deleted_at IS NULL;         -- job quét dọn TTL 24h chỉ đọc index này

CREATE TABLE review_results (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id     uuid NOT NULL REFERENCES video_review_requests(id) ON DELETE CASCADE,
    form_check_id  uuid NOT NULL REFERENCES form_checks(id),
    -- 5 giá trị, không phải 3. WARN là "sát ngưỡng"; NOT_APPLICABLE là "check này
    -- không đáng tin ở góc quay của clip" — khác LOW_CONFIDENCE "đo được nhưng
    -- độ tin cậy landmark thấp". Gộp lại là mất thông tin sửa lỗi của người dùng.
    verdict        text NOT NULL CHECK (verdict IN
                   ('PASS','WARN','FAIL','LOW_CONFIDENCE','NOT_APPLICABLE')),
    confidence     numeric(3,2),
    measured       jsonb,             -- {"hip_depth_ratio": 1.42, "reps": 3}
    cue_text_vi    text,              -- copy tại thời điểm chấm, KHÔNG join lại form_checks
    is_primary     boolean NOT NULL DEFAULT false,   -- đúng MỘT dòng true: lỗi quan trọng nhất
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (request_id, form_check_id)
);

-- Nút "góp ý này sai" — dùng cho CẢ kết quả chấm form LẪN quyết định tải.
CREATE TABLE cue_feedback (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_result_id  uuid REFERENCES review_results(id) ON DELETE CASCADE,
    load_decision_id  uuid REFERENCES load_decisions(id) ON DELETE CASCADE,
    is_wrong          boolean NOT NULL,
    note              text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(review_result_id, load_decision_id) = 1)
);
