-- Seed nội dung. Nguồn: content-seed-v1.md §7.
-- Repeatable migration (tiền tố R__): Flyway chạy lại mỗi khi checksum file đổi.
-- ON CONFLICT DO UPDATE nên chạy lại bao nhiêu lần cũng an toàn.
--
-- ĐÂY LÀ BỘ SEED GIẢ LẬP để chạy được end-to-end (20 bài, 10 template), KHÔNG
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
   'Gập hông khoảng 45 độ, lưng thẳng, kéo tạ về phía bụng dưới.', false),

  -- Bài cho các template tay không, tạ đơn, tạ ấm, phòng gym (09-26). Chưa bài nào
  -- analyzable: analyzer chưa map tới các slug này.
  -- ponytail: equipment chỉ ghi thiết bị chính. Goblet squat, kéo một tay làm được bằng
  -- tạ ấm nhưng ghi DUMBBELL, nên SubstituteController (containsAll) không gợi ý chúng
  -- cho người chỉ có tạ ấm. Cần kiểu "một trong các thiết bị" thì thêm cột riêng.
  ('bodyweight-squat', 'Bodyweight Squat', 'Squat tay không',
   '{QUADS,GLUTES}', '{}',
   'Chân rộng bằng vai, đẩy hông ra sau và hạ tới khi đùi ngang sàn, gót chân bám sàn.', false),

  ('reverse-lunge', 'Reverse Lunge', 'Lunge lùi',
   '{QUADS,GLUTES}', '{}',
   'Bước một chân ra sau, hạ tới khi gối sau gần chạm sàn, đẩy gót chân trước để đứng lên. Đổi chân mỗi rep.', false),

  ('glute-bridge', 'Glute Bridge', 'Cầu mông',
   '{GLUTES,HAMSTRINGS}', '{}',
   'Nằm ngửa, gập gối, đẩy hông lên tới khi thân và đùi thành một đường thẳng, siết mông ở đỉnh.', false),

  ('decline-push-up', 'Decline Push-up', 'Chống đẩy chân cao',
   '{CHEST,SHOULDERS,TRICEPS}', '{}',
   'Gác mũi chân lên ghế hoặc bậc cao, hạ ngực sát sàn rồi đẩy lên. Chân càng cao càng dồn lực lên vai.', false),

  ('superman', 'Superman', 'Superman',
   '{LOWER_BACK,UPPER_BACK,GLUTES}', '{}',
   'Nằm sấp, nâng cùng lúc tay, ngực và chân khỏi sàn, giữ 1–2 giây rồi hạ.', false),

  ('dead-bug', 'Dead Bug', 'Dead bug',
   '{CORE}', '{}',
   'Nằm ngửa, tay chân co 90 độ, duỗi tay và chân đối diện ra xa. Lưng dưới luôn ép sàn.', false),

  ('goblet-squat', 'Goblet Squat', 'Goblet squat',
   '{QUADS,GLUTES,CORE}', '{DUMBBELL}',
   'Ôm một tạ đơn hoặc tạ ấm trước ngực, hạ hông giữa hai gối tới khi đùi ngang sàn, ngực giữ thẳng.', false),

  ('lunge-dumbbell', 'Dumbbell Lunge', 'Lunge tạ đơn',
   '{QUADS,GLUTES}', '{DUMBBELL}',
   'Hai tay cầm tạ đơn, bước lùi một chân và hạ tới khi gối sau gần chạm sàn. Đổi chân mỗi rep.', false),

  ('dumbbell-floor-press', 'Dumbbell Floor Press', 'Đẩy ngực tạ đơn nằm sàn',
   '{CHEST,TRICEPS,SHOULDERS}', '{DUMBBELL}',
   'Nằm ngửa trên sàn, hạ tạ tới khi khuỷu chạm nhẹ sàn rồi đẩy thẳng lên. Không cần ghế.', false),

  ('one-arm-row', 'One-arm Row', 'Kéo tạ một tay',
   '{LATS,UPPER_BACK,BICEPS}', '{DUMBBELL}',
   'Một tay chống lên ghế hoặc đùi, lưng thẳng, kéo tạ đơn hoặc tạ ấm về hông. Đủ rep một bên rồi đổi.', false),

  ('biceps-curl', 'Biceps Curl', 'Cuốn tạ tay',
   '{BICEPS}', '{DUMBBELL}',
   'Khuỷu sát thân, cuốn tạ lên ngang vai rồi hạ chậm, không đưa người lấy đà.', false),

  ('lateral-raise', 'Lateral Raise', 'Nâng tạ ngang vai',
   '{SHOULDERS}', '{DUMBBELL}',
   'Khuỷu hơi cong, nâng tạ sang hai bên tới ngang vai rồi hạ chậm.', false),

  ('kettlebell-swing', 'Kettlebell Swing', 'Swing tạ ấm',
   '{GLUTES,HAMSTRINGS,CORE}', '{KETTLEBELL}',
   'Gập hông đưa tạ ra sau giữa hai chân, bật hông để tạ lên ngang ngực. Lực đến từ hông, không từ tay.', false),

  ('barbell-bench-press', 'Barbell Bench Press', 'Đẩy ngực tạ đòn',
   '{CHEST,TRICEPS,SHOULDERS}', '{BARBELL_RACK,BENCH}',
   'Nằm trên ghế, bả vai ép vào ghế, hạ thanh đòn chạm giữa ngực rồi đẩy thẳng lên.', false),

  ('deadlift', 'Deadlift', 'Deadlift',
   '{HAMSTRINGS,GLUTES,LOWER_BACK}', '{BARBELL_RACK}',
   'Thanh đòn sát ống chân, lưng thẳng, đạp chân xuống sàn để kéo tạ lên tới khi đứng thẳng.', false)
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
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

-- ── Thêm 09-26: phủ mọi tổ hợp thiết bị × 2–6 buổi/tuần. Hai template tay không
-- (required_equipment rỗng) bảo đảm ai cũng có ít nhất một template đúng số buổi.
-- Bài không tạ và bài thiếu increment_kg: engine bỏ qua, người dùng tăng rep.

('bodyweight-full-body', 'Toàn thân không dụng cụ',
 'Toàn thân mỗi buổi, hai buổi A/B luân phiên, tập ở nhà không cần dụng cụ. Tăng dần rep trong khoảng; đủ trần mọi set thì hạ chậm hơn. Hợp với người mới hoặc lúc không ra phòng tập được.',
 2, 4, ARRAY[]::text[],
 '[
   {"order":1,"label":"A","exercises":[
     {"slug":"bodyweight-squat","sets":3,"reps_min":12,"reps_max":20,"rest_sec":60},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90},
     {"slug":"glute-bridge","sets":3,"reps_min":12,"reps_max":20,"rest_sec":60},
     {"slug":"dead-bug","sets":3,"reps_min":8,"reps_max":12,"rest_sec":45}]},
   {"order":2,"label":"B","exercises":[
     {"slug":"reverse-lunge","sets":3,"reps_min":8,"reps_max":12,"rest_sec":60},
     {"slug":"decline-push-up","sets":3,"reps_min":6,"reps_max":12,"rest_sec":90},
     {"slug":"superman","sets":3,"reps_min":10,"reps_max":15,"rest_sec":45},
     {"slug":"push-up","sets":2,"reps_min":8,"reps_max":15,"rest_sec":90}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,"increment_kg":{},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('bodyweight-upper-lower', 'Trên / Dưới không dụng cụ',
 'Thân trên và thân dưới luân phiên mỗi ngày nên tập được 5–6 buổi mà cơ vẫn kịp hồi. Không cần dụng cụ, tăng tiến bằng rep. Hợp với người muốn tập đều mỗi ngày ở nhà.',
 5, 6, ARRAY[]::text[],
 '[
   {"order":1,"label":"Trên","exercises":[
     {"slug":"push-up","sets":4,"reps_min":8,"reps_max":15,"rest_sec":90},
     {"slug":"decline-push-up","sets":3,"reps_min":6,"reps_max":12,"rest_sec":90},
     {"slug":"superman","sets":3,"reps_min":10,"reps_max":15,"rest_sec":45},
     {"slug":"dead-bug","sets":3,"reps_min":8,"reps_max":12,"rest_sec":45}]},
   {"order":2,"label":"Dưới","exercises":[
     {"slug":"bodyweight-squat","sets":4,"reps_min":15,"reps_max":25,"rest_sec":60},
     {"slug":"reverse-lunge","sets":3,"reps_min":10,"reps_max":15,"rest_sec":60},
     {"slug":"glute-bridge","sets":3,"reps_min":15,"reps_max":25,"rest_sec":60}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,"increment_kg":{},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('dumbbell-full-body', 'Toàn thân tạ đơn',
 'Toàn thân mỗi buổi với một đôi tạ đơn, hai buổi A/B luân phiên. Double progression: chạm đỉnh khoảng rep ở mọi set thì tăng tạ. Hợp với người tập ở nhà có tạ đơn.',
 2, 3, ARRAY['DUMBBELL'],
 '[
   {"order":1,"label":"A","exercises":[
     {"slug":"goblet-squat","sets":3,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"dumbbell-floor-press","sets":3,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"one-arm-row","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"dead-bug","sets":2,"reps_min":8,"reps_max":12,"rest_sec":45}]},
   {"order":2,"label":"B","exercises":[
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"overhead-press","sets":3,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"lunge-dumbbell","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"push-up","sets":2,"reps_min":8,"reps_max":15,"rest_sec":90}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,
   "increment_kg":{"goblet-squat":2,"dumbbell-floor-press":2,"one-arm-row":2,
                   "romanian-deadlift":2,"overhead-press":1,"lunge-dumbbell":2},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('dumbbell-upper-lower-4x', 'Trên / Dưới tạ đơn 4 buổi',
 'Chia trên và dưới, chu kỳ 4 buổi, chỉ cần tạ đơn. Double progression: chạm đỉnh khoảng rep ở mọi set thì tăng tạ. Hợp với người đã tập vài tháng ở nhà.',
 4, 4, ARRAY['DUMBBELL'],
 '[
   {"order":1,"label":"Trên A","exercises":[
     {"slug":"dumbbell-floor-press","sets":4,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"one-arm-row","sets":4,"reps_min":8,"reps_max":10,"rest_sec":90},
     {"slug":"lateral-raise","sets":3,"reps_min":12,"reps_max":15,"rest_sec":60},
     {"slug":"biceps-curl","sets":2,"reps_min":10,"reps_max":12,"rest_sec":60}]},
   {"order":2,"label":"Dưới A","exercises":[
     {"slug":"goblet-squat","sets":4,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"glute-bridge","sets":3,"reps_min":12,"reps_max":20,"rest_sec":60}]},
   {"order":3,"label":"Trên B","exercises":[
     {"slug":"overhead-press","sets":4,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"one-arm-row","sets":3,"reps_min":10,"reps_max":12,"rest_sec":90},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90},
     {"slug":"biceps-curl","sets":2,"reps_min":10,"reps_max":12,"rest_sec":60}]},
   {"order":4,"label":"Dưới B","exercises":[
     {"slug":"lunge-dumbbell","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"romanian-deadlift","sets":4,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"goblet-squat","sets":3,"reps_min":12,"reps_max":15,"rest_sec":90}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,
   "increment_kg":{"dumbbell-floor-press":2,"one-arm-row":2,"lateral-raise":1,"biceps-curl":1,
                   "goblet-squat":2,"romanian-deadlift":2,"overhead-press":1,"lunge-dumbbell":2},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('dumbbell-push-pull-legs', 'Đẩy / Kéo / Chân tạ đơn',
 'Ba buổi Đẩy, Kéo, Chân lặp lại; tập 6 buổi thì mỗi nhóm cơ được tập hai lần một tuần. Double progression. Hợp với người tập lâu, muốn tập gần như mỗi ngày ở nhà.',
 5, 6, ARRAY['DUMBBELL'],
 '[
   {"order":1,"label":"Đẩy","exercises":[
     {"slug":"dumbbell-floor-press","sets":4,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"overhead-press","sets":3,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"lateral-raise","sets":3,"reps_min":12,"reps_max":15,"rest_sec":60},
     {"slug":"push-up","sets":2,"reps_min":8,"reps_max":15,"rest_sec":90}]},
   {"order":2,"label":"Kéo","exercises":[
     {"slug":"one-arm-row","sets":4,"reps_min":8,"reps_max":10,"rest_sec":90},
     {"slug":"bent-over-row","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"biceps-curl","sets":3,"reps_min":10,"reps_max":12,"rest_sec":60},
     {"slug":"superman","sets":2,"reps_min":10,"reps_max":15,"rest_sec":45}]},
   {"order":3,"label":"Chân","exercises":[
     {"slug":"goblet-squat","sets":4,"reps_min":8,"reps_max":12,"rest_sec":120},
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":10,"rest_sec":120},
     {"slug":"lunge-dumbbell","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"glute-bridge","sets":2,"reps_min":12,"reps_max":20,"rest_sec":60}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,
   "increment_kg":{"dumbbell-floor-press":2,"overhead-press":1,"lateral-raise":1,
                   "one-arm-row":2,"bent-over-row":2,"biceps-curl":1,
                   "goblet-squat":2,"romanian-deadlift":2,"lunge-dumbbell":2},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

-- Tạ ấm nhảy 4 kg một nấc: engine tăng/giảm theo bước 2,5 kg sẽ ra số không có
-- quả nào, nên increment_kg để trống — người dùng tự lên quả nặng hơn.
('kettlebell-full-body', 'Toàn thân tạ ấm',
 'Toàn thân mỗi buổi quanh bài swing, hai buổi A/B luân phiên. Tăng rep trong khoảng; đủ trần mọi set thì lên quả nặng hơn. Hợp với người tập ở nhà, muốn vừa khoẻ vừa giảm mỡ.',
 2, 4, ARRAY['KETTLEBELL'],
 '[
   {"order":1,"label":"A","exercises":[
     {"slug":"kettlebell-swing","sets":4,"reps_min":12,"reps_max":20,"rest_sec":90},
     {"slug":"goblet-squat","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"decline-push-up","sets":3,"reps_min":6,"reps_max":12,"rest_sec":90},
     {"slug":"dead-bug","sets":3,"reps_min":8,"reps_max":12,"rest_sec":45}]},
   {"order":2,"label":"B","exercises":[
     {"slug":"kettlebell-swing","sets":4,"reps_min":12,"reps_max":20,"rest_sec":90},
     {"slug":"one-arm-row","sets":3,"reps_min":8,"reps_max":12,"rest_sec":90},
     {"slug":"reverse-lunge","sets":3,"reps_min":8,"reps_max":12,"rest_sec":60},
     {"slug":"push-up","sets":3,"reps_min":8,"reps_max":15,"rest_sec":90}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,"increment_kg":{},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('strength-3x5', 'Sức mạnh 3×5',
 'Ba bài lớn squat, đẩy ngực, deadlift với ít rep, tạ nặng; hai buổi A/B luân phiên. Tăng tải tuyến tính: đủ rep mọi set là tăng buổi sau. Hợp với người muốn tăng sức mạnh.',
 2, 3, ARRAY['BARBELL_RACK','BENCH'],
 '[
   {"order":1,"label":"A","exercises":[
     {"slug":"barbell-back-squat","sets":3,"reps_min":5,"reps_max":5,"rest_sec":180},
     {"slug":"barbell-bench-press","sets":3,"reps_min":5,"reps_max":5,"rest_sec":180},
     {"slug":"bent-over-row","sets":3,"reps_min":5,"reps_max":5,"rest_sec":150}]},
   {"order":2,"label":"B","exercises":[
     {"slug":"barbell-back-squat","sets":3,"reps_min":5,"reps_max":5,"rest_sec":180},
     {"slug":"overhead-press","sets":3,"reps_min":5,"reps_max":5,"rest_sec":150},
     {"slug":"deadlift","sets":1,"reps_min":5,"reps_max":5,"rest_sec":180}]}
 ]'::jsonb,
 '{"mode":"LINEAR","target_rpe":8,
   "increment_kg":{"barbell-back-squat":2.5,"barbell-bench-press":2.5,"bent-over-row":2.5,
                   "overhead-press":1.25,"deadlift":5},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb),

('gym-push-pull-legs', 'Đẩy / Kéo / Chân phòng gym',
 'Ba buổi Đẩy, Kéo, Chân lặp lại với tạ đòn và tạ đơn; tập 6 buổi thì mỗi nhóm cơ được tập hai lần một tuần. Double progression. Hợp với người đã tập trên một năm, muốn tăng cơ.',
 5, 6, ARRAY['BARBELL_RACK','BENCH','DUMBBELL'],
 '[
   {"order":1,"label":"Đẩy","exercises":[
     {"slug":"barbell-bench-press","sets":4,"reps_min":6,"reps_max":8,"rest_sec":180},
     {"slug":"overhead-press","sets":3,"reps_min":8,"reps_max":10,"rest_sec":150},
     {"slug":"lateral-raise","sets":3,"reps_min":12,"reps_max":15,"rest_sec":60},
     {"slug":"push-up","sets":2,"reps_min":8,"reps_max":15,"rest_sec":90}]},
   {"order":2,"label":"Kéo","exercises":[
     {"slug":"deadlift","sets":3,"reps_min":4,"reps_max":6,"rest_sec":180},
     {"slug":"bent-over-row","sets":4,"reps_min":8,"reps_max":10,"rest_sec":150},
     {"slug":"one-arm-row","sets":3,"reps_min":10,"reps_max":12,"rest_sec":90},
     {"slug":"biceps-curl","sets":3,"reps_min":10,"reps_max":12,"rest_sec":60}]},
   {"order":3,"label":"Chân","exercises":[
     {"slug":"barbell-back-squat","sets":4,"reps_min":6,"reps_max":8,"rest_sec":180},
     {"slug":"romanian-deadlift","sets":3,"reps_min":8,"reps_max":10,"rest_sec":150},
     {"slug":"lunge-dumbbell","sets":3,"reps_min":10,"reps_max":12,"rest_sec":90},
     {"slug":"glute-bridge","sets":2,"reps_min":12,"reps_max":20,"rest_sec":60}]}
 ]'::jsonb,
 '{"mode":"DOUBLE","target_rpe":8,
   "increment_kg":{"barbell-bench-press":2.5,"overhead-press":1.25,"lateral-raise":1,
                   "deadlift":5,"bent-over-row":2.5,"one-arm-row":2,"biceps-curl":1,
                   "barbell-back-squat":2.5,"romanian-deadlift":2.5,"lunge-dumbbell":2},
   "deload_pct":10,"fail_streak_to_deload":2}'::jsonb)

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, methodology = EXCLUDED.methodology,
  sessions_min = EXCLUDED.sessions_min, sessions_max = EXCLUDED.sessions_max,
  required_equipment = EXCLUDED.required_equipment,
  week_structure = EXCLUDED.week_structure, progression = EXCLUDED.progression,
  updated_at = now();
