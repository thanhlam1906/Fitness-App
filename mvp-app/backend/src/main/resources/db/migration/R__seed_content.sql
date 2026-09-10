-- Seed nội dung. Nguồn: content-seed-v1.md §7.
-- Repeatable migration (tiền tố R__): Flyway chạy lại mỗi khi checksum file đổi.
-- ON CONFLICT DO UPDATE nên chạy lại bao nhiêu lần cũng an toàn.
--
-- ĐÂY LÀ BỘ SEED GIẢ LẬP để chạy được end-to-end (5 bài, 2 template), KHÔNG
-- PHẢI nội dung phát hành. Giới hạn đã biết: content-seed-v1.md §8.
-- Ngưỡng form_checks CHƯA hiệu chỉnh trên bộ clip — content-seed-v1.md §3.1.1.

-- ══════════════════════════ BÀI TẬP ══════════════════════════
INSERT INTO exercises (slug, name_en, name_vi, muscle_groups, equipment, description, analyzable) VALUES
  ('barbell-back-squat', 'Barbell Back Squat', 'Squat gánh tạ',
   '{QUADS,GLUTES,CORE}', '{BARBELL_RACK}',
   'Gánh thanh đòn trên lưng trên, hạ hông xuống tới ngang gối rồi đứng lên.', true),

  ('romanian-deadlift', 'Romanian Deadlift', 'Romanian Deadlift',
   '{HAMSTRINGS,GLUTES,LOWER_BACK}', '{BARBELL_RACK,DUMBBELL}',
   'Gập hông ra sau, gối hơi cong cố định, hạ tạ sát chân tới khi căng gân kheo.', true),

  ('overhead-press', 'Overhead Press', 'Đẩy vai qua đầu',
   '{SHOULDERS,TRICEPS,CORE}', '{BARBELL_RACK,DUMBBELL}',
   'Đẩy tạ thẳng từ vai lên qua đầu, siết bụng, không ngửa lưng dưới.', true),

  ('push-up', 'Push-up', 'Chống đẩy',
   '{CHEST,TRICEPS,SHOULDERS,CORE}', '{}',
   'Thân giữ một đường thẳng, hạ ngực sát sàn, khuỷu khoảng 45 độ so với thân.', true),

  ('bent-over-row', 'Bent-over Row', 'Kéo tạ tư thế gập người',
   '{LATS,UPPER_BACK,BICEPS}', '{BARBELL_RACK,DUMBBELL}',
   'Gập hông khoảng 45 độ, lưng thẳng, kéo tạ về phía bụng dưới.', false)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_vi = EXCLUDED.name_vi,
  muscle_groups = EXCLUDED.muscle_groups, equipment = EXCLUDED.equipment,
  description = EXCLUDED.description, analyzable = EXCLUDED.analyzable,
  updated_at = now();

-- ═══════════════ HƯỚNG DẪN QUAY — màn 8 ═══════════════
-- Góc nên quay lấy từ bảng §6.3 ke-hoach-chi-tiet-chuc-nang-v1.md.
-- F2 còn treo: hình minh hoạ khung người cần chụp hoặc vẽ, không code được.

UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra độ sâu và độ nghiêng thân."}, {"code": "FRONTAL", "label": "Chính diện", "why": "Chính diện — kiểm tra gối có chụm vào trong không."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'barbell-back-squat';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra thân thẳng và độ hạ ngực."}, {"code": "FRONTAL", "label": "Chính diện", "why": "Chính diện — kiểm tra góc khuỷu."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'push-up';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra lưng dưới và đường đi của tạ."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'overhead-press';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra hip hinge, lưng thẳng, tạ sát chân."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'romanian-deadlift';
-- ═══════════════════ FORM_CHECKS — chỉ squat (TN2 Đợt 4) ═══════════════════
-- knee_track: ĐÃ chuẩn hoá theo rộng vai (không đơn vị) — lỗi A0 của
-- concept-analyzer-v1.md §11 đã sửa ở analyzer/pipeline/metrics.py. Ngưỡng cũ
-- 0.02/0.05 m quy đổi theo rộng vai ~0.38 m → 0.053/0.13. Vẫn là số suy ra,
-- CHƯA hiệu chỉnh trên clip.
-- depth: 1.10/1.30 suy ra bằng hình học (song song = đùi ngang), content-seed-v1.md §3.1.1.
-- torso_lean: số gốc của demo, chưa đối chiếu.
INSERT INTO form_checks
  (exercise_id, code, metric, valid_viewpoints, thresholds, confidence_min,
   cue_pass_vi, cue_warn_vi, cue_fail_vi, priority)
SELECT e.id, v.code, v.metric, v.viewpoints, v.thresholds::jsonb, 0.70,
       v.cue_pass, v.cue_warn, v.cue_fail, v.priority
FROM exercises e, (VALUES
  ('knee_track', 'knee_inward_travel', ARRAY['FRONTAL'],
   '{"pass_below": 0.053, "warn_below": 0.13}',
   'Gối di chuyển ổn định, thẳng theo hướng mũi chân.',
   'Gối hơi chụm vào trong khi hạ — chủ động đẩy gối ra ngoài theo hướng mũi chân.',
   'Gối chụm vào trong khi hạ xuống. Đẩy gối ra ngoài theo hướng mũi chân, giữ đầu gối thẳng hàng với ngón chân giữa.',
   1),

  ('depth', 'hip_depth_ratio', ARRAY['SAGITTAL'],
   '{"pass_below": 1.10, "warn_below": 1.30}',
   'Độ sâu tốt: đùi đã xuống ngang sàn (song song) hoặc sâu hơn.',
   'Sát ngưỡng — hạ hông thêm một chút nữa là chạm mức song song.',
   'Chưa xuống đủ sâu. Hạ hông cho tới khi mặt trên đùi song song sàn.',
   2),

  ('torso_lean', 'torso_lean_deg', ARRAY['SAGITTAL'],
   '{"pass_between": [10, 55], "warn_between": [5, 65]}',
   'Độ nghiêng thân hợp lý, lưng giữ được đường thẳng.',
   'Thân nghiêng hơi nhiều — giữ ngực mở, đẩy hông ra sau.',
   'Thân nghiêng quá nhiều khi hạ xuống. Siết bụng, giữ ngực nâng, đẩy hông ra sau.',
   3)
) AS v(code, metric, viewpoints, thresholds, cue_pass, cue_warn, cue_fail, priority)
WHERE e.slug = 'barbell-back-squat'
ON CONFLICT (exercise_id, code) DO UPDATE SET
  metric = EXCLUDED.metric, valid_viewpoints = EXCLUDED.valid_viewpoints,
  thresholds = EXCLUDED.thresholds, confidence_min = EXCLUDED.confidence_min,
  cue_pass_vi = EXCLUDED.cue_pass_vi, cue_warn_vi = EXCLUDED.cue_warn_vi,
  cue_fail_vi = EXCLUDED.cue_fail_vi, priority = EXCLUDED.priority,
  updated_at = now();

-- ═══════════════════════ TEMPLATE ═══════════════════════
-- Hai template khác nhau ở hai trục cố ý: số buổi/tuần (TemplateMatcher có gì để
-- phân biệt) và cơ chế tăng tải LINEAR vs DOUBLE (ProgressionEngine chạy cả hai
-- nhánh). content-seed-v1.md §4.
INSERT INTO program_templates
  (slug, name, methodology, sessions_min, sessions_max, required_equipment,
   week_structure, progression) VALUES

('full-body-3x', 'Full Body 3 buổi',
 'Toàn thân mỗi buổi, hai buổi A/B luân phiên. Tăng tải tuyến tính: đủ rep mọi set là tăng buổi sau. Hợp với người mới và người quay lại sau nghỉ dài.',
 2, 3, ARRAY['BARBELL_RACK'],
 '[
   {"order":1,"label":"A","exercises":[
     {"slug":"barbell-back-squat","sets":3,"reps_min":5,"reps_max":5,"rest_sec":180},
     {"slug":"overhead-press","sets":3,"reps_min":5,"reps_max":5,"rest_sec":150},
     {"slug":"bent-over-row","sets":3,"reps_min":5,"reps_max":5,"rest_sec":150}]},
   {"order":2,"label":"B","exercises":[
     {"slug":"barbell-back-squat","sets":3,"reps_min":5,"reps_max":5,"rest_sec":180},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90},
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":8,"rest_sec":150}]}
 ]'::jsonb,
 '{"mode":"LINEAR","target_rpe":8,
   "increment_kg":{"barbell-back-squat":2.5,"romanian-deadlift":2.5,
                   "bent-over-row":2.5,"overhead-press":1.25},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('upper-lower-4x', 'Upper / Lower 4 buổi',
 'Chia trên và dưới, chu kỳ 4 buổi. Double progression: chạm đỉnh khoảng rep ở mọi set thì tăng tải và đưa rep về đáy khoảng. Hợp với người đã tập được vài tháng.',
 4, 4, ARRAY['BARBELL_RACK'],
 '[
   {"order":1,"label":"Trên A","exercises":[
     {"slug":"overhead-press","sets":4,"reps_min":6,"reps_max":8,"rest_sec":150},
     {"slug":"bent-over-row","sets":4,"reps_min":6,"reps_max":8,"rest_sec":150},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90}]},
   {"order":2,"label":"Dưới A","exercises":[
     {"slug":"barbell-back-squat","sets":4,"reps_min":6,"reps_max":8,"rest_sec":180},
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":10,"rest_sec":150}]},
   {"order":3,"label":"Trên B","exercises":[
     {"slug":"bent-over-row","sets":4,"reps_min":8,"reps_max":10,"rest_sec":150},
     {"slug":"overhead-press","sets":3,"reps_min":8,"reps_max":10,"rest_sec":150},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90}]},
   {"order":4,"label":"Dưới B","exercises":[
     {"slug":"barbell-back-squat","sets":3,"reps_min":8,"reps_max":10,"rest_sec":180},
     {"slug":"romanian-deadlift","sets":4,"reps_min":6,"reps_max":8,"rest_sec":150}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,
   "increment_kg":{"barbell-back-squat":2.5,"romanian-deadlift":2.5,
                   "bent-over-row":2.5,"overhead-press":1.25},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, methodology = EXCLUDED.methodology,
  sessions_min = EXCLUDED.sessions_min, sessions_max = EXCLUDED.sessions_max,
  required_equipment = EXCLUDED.required_equipment,
  week_structure = EXCLUDED.week_structure, progression = EXCLUDED.progression,
  updated_at = now();
