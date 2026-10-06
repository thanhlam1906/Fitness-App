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
   'Gập hông khoảng 45 độ, lưng thẳng, kéo tạ về phía bụng dưới.', true),

  -- Bài cho các template tay không, tạ đơn, tạ ấm, phòng gym (09-26). Cột analyzable ở đây bị ghi
  -- đè ở cuối khối KHỚP CẦN KIỂM: bài chấm được khi có khớp đang bật.
  -- ponytail: equipment chỉ ghi thiết bị chính. Goblet squat, kéo một tay làm được bằng
  -- tạ ấm nhưng ghi DUMBBELL, nên SubstituteController (containsAll) không gợi ý chúng
  -- cho người chỉ có tạ ấm. Cần kiểu "một trong các thiết bị" thì thêm cột riêng.
  ('bodyweight-squat', 'Bodyweight Squat', 'Squat tay không',
   '{QUADS,GLUTES}', '{}',
   'Chân rộng bằng vai, đẩy hông ra sau và hạ tới khi đùi ngang sàn, gót chân bám sàn.', true),

  ('reverse-lunge', 'Reverse Lunge', 'Lunge lùi',
   '{QUADS,GLUTES}', '{}',
   'Bước một chân ra sau, hạ tới khi gối sau gần chạm sàn, đẩy gót chân trước để đứng lên. Đổi chân mỗi rep.', true),

  ('glute-bridge', 'Glute Bridge', 'Cầu mông',
   '{GLUTES,HAMSTRINGS}', '{}',
   'Nằm ngửa, gập gối, đẩy hông lên tới khi thân và đùi thành một đường thẳng, siết mông ở đỉnh.', true),

  ('decline-push-up', 'Decline Push-up', 'Chống đẩy chân cao',
   '{CHEST,SHOULDERS,TRICEPS}', '{}',
   'Gác mũi chân lên ghế hoặc bậc cao, hạ ngực sát sàn rồi đẩy lên. Chân càng cao càng dồn lực lên vai.', true),

  ('superman', 'Superman', 'Superman',
   '{LOWER_BACK,UPPER_BACK,GLUTES}', '{}',
   'Nằm sấp, nâng cùng lúc tay, ngực và chân khỏi sàn, giữ 1–2 giây rồi hạ.', true),

  ('dead-bug', 'Dead Bug', 'Dead bug',
   '{CORE}', '{}',
   'Nằm ngửa, tay chân co 90 độ, duỗi tay và chân đối diện ra xa. Lưng dưới luôn ép sàn.', true),

  ('goblet-squat', 'Goblet Squat', 'Goblet squat',
   '{QUADS,GLUTES,CORE}', '{DUMBBELL}',
   'Ôm một tạ đơn hoặc tạ ấm trước ngực, hạ hông giữa hai gối tới khi đùi ngang sàn, ngực giữ thẳng.', true),

  ('lunge-dumbbell', 'Dumbbell Lunge', 'Lunge tạ đơn',
   '{QUADS,GLUTES}', '{DUMBBELL}',
   'Hai tay cầm tạ đơn, bước lùi một chân và hạ tới khi gối sau gần chạm sàn. Đổi chân mỗi rep.', true),

  ('dumbbell-floor-press', 'Dumbbell Floor Press', 'Đẩy ngực tạ đơn nằm sàn',
   '{CHEST,TRICEPS,SHOULDERS}', '{DUMBBELL}',
   'Nằm ngửa trên sàn, hạ tạ tới khi khuỷu chạm nhẹ sàn rồi đẩy thẳng lên. Không cần ghế.', true),

  ('one-arm-row', 'One-arm Row', 'Kéo tạ một tay',
   '{LATS,UPPER_BACK,BICEPS}', '{DUMBBELL}',
   'Một tay chống lên ghế hoặc đùi, lưng thẳng, kéo tạ đơn hoặc tạ ấm về hông. Đủ rep một bên rồi đổi.', true),

  ('biceps-curl', 'Biceps Curl', 'Cuốn tạ tay',
   '{BICEPS}', '{DUMBBELL}',
   'Khuỷu sát thân, cuốn tạ lên ngang vai rồi hạ chậm, không đưa người lấy đà.', true),

  ('lateral-raise', 'Lateral Raise', 'Nâng tạ ngang vai',
   '{SHOULDERS}', '{DUMBBELL}',
   'Khuỷu hơi cong, nâng tạ sang hai bên tới ngang vai rồi hạ chậm.', true),

  ('kettlebell-swing', 'Kettlebell Swing', 'Swing tạ ấm',
   '{GLUTES,HAMSTRINGS,CORE}', '{KETTLEBELL}',
   'Gập hông đưa tạ ra sau giữa hai chân, bật hông để tạ lên ngang ngực. Lực đến từ hông, không từ tay.', true),

  ('barbell-bench-press', 'Barbell Bench Press', 'Đẩy ngực tạ đòn',
   '{CHEST,TRICEPS,SHOULDERS}', '{BARBELL_RACK,BENCH}',
   'Nằm trên ghế, bả vai ép vào ghế, hạ thanh đòn chạm giữa ngực rồi đẩy thẳng lên.', true),

  ('deadlift', 'Deadlift', 'Deadlift',
   '{HAMSTRINGS,GLUTES,LOWER_BACK}', '{BARBELL_RACK}',
   'Thanh đòn sát ống chân, lưng thẳng, đạp chân xuống sàn để kéo tạ lên tới khi đứng thẳng.', true)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en, name_vi = EXCLUDED.name_vi,
  muscle_groups = EXCLUDED.muscle_groups, equipment = EXCLUDED.equipment,
  description = EXCLUDED.description, analyzable = EXCLUDED.analyzable,
  updated_at = now();

-- ═══════════════ HƯỚNG DẪN NGẮN — khung chi tiết bài ═══════════════
-- doc/design-anh-dong-v1.md §3: mỗi bài 3 bước cách tập và 2 lỗi hay gặp.
UPDATE exercises e SET steps_vi = v.steps, mistakes_vi = v.mistakes
FROM (VALUES
  ('barbell-back-squat',
   ARRAY['Gánh thanh đòn trên lưng trên, chân rộng bằng vai.', 'Đẩy hông ra sau, hạ tới khi đùi ngang sàn.', 'Đạp cả bàn chân để đứng lên, giữ ngực thẳng.'],
   ARRAY['Gối chụm vào trong khi đứng lên.', 'Gót chân nhấc khỏi sàn.']),
  ('romanian-deadlift',
   ARRAY['Cầm tạ trước đùi, gối hơi cong và giữ cố định.', 'Đẩy hông ra sau, hạ tạ sát chân tới khi căng đùi sau.', 'Siết mông, đẩy hông ra trước để đứng thẳng lại.'],
   ARRAY['Cong lưng khi hạ tạ.', 'Gập gối như squat thay vì đẩy hông ra sau.']),
  ('overhead-press',
   ARRAY['Đứng thẳng, tạ ngang vai, khuỷu nằm dưới cổ tay.', 'Đẩy tạ thẳng lên tới khi tay duỗi hết.', 'Hạ chậm về ngang vai rồi lặp lại.'],
   ARRAY['Ngửa lưng dưới để đẩy.', 'Đẩy tạ ra trước mặt thay vì thẳng lên.']),
  ('push-up',
   ARRAY['Hai tay rộng hơn vai một chút, thân thẳng từ đầu tới gót.', 'Hạ ngực sát sàn, khuỷu chếch về sau khoảng 45 độ.', 'Đẩy sàn ra xa để lên, giữ bụng siết.'],
   ARRAY['Võng hông hoặc chổng mông.', 'Khuỷu tay bè ngang ra hai bên.']),
  ('bent-over-row',
   ARRAY['Gập hông khoảng 45 độ, lưng thẳng, tay buông thẳng cầm tạ.', 'Kéo tạ về phía bụng dưới, ép hai bả vai lại.', 'Hạ chậm tới khi tay duỗi hết.'],
   ARRAY['Giật người lấy đà.', 'Cong lưng khi gập người.']),
  ('bodyweight-squat',
   ARRAY['Đứng chân rộng bằng vai, mũi chân hơi mở.', 'Đẩy hông ra sau như ngồi xuống ghế, hạ tới khi đùi ngang sàn.', 'Đạp cả bàn chân để đứng lên, siết mông ở đỉnh.'],
   ARRAY['Gối chụm vào trong.', 'Gót chân nhấc khỏi sàn.']),
  ('reverse-lunge',
   ARRAY['Đứng thẳng, bước một chân ra sau.', 'Hạ tới khi gối sau gần chạm sàn, thân giữ thẳng.', 'Đẩy gót chân trước để về tư thế đứng, đổi chân.'],
   ARRAY['Gối trước đổ vào trong.', 'Ngả người ra trước quá nhiều.']),
  ('glute-bridge',
   ARRAY['Nằm ngửa, gập gối, bàn chân đặt gần mông.', 'Đẩy hông lên tới khi thân và đùi thành một đường thẳng.', 'Siết mông một nhịp rồi hạ chậm.'],
   ARRAY['Ưỡn lưng thay vì đẩy bằng mông.', 'Đẩy bằng mũi chân, gót nhấc lên.']),
  ('decline-push-up',
   ARRAY['Gác mũi chân lên ghế hoặc bậc cao, hai tay rộng hơn vai.', 'Hạ ngực sát sàn, thân giữ thẳng.', 'Đẩy lên tới khi tay duỗi hết.'],
   ARRAY['Võng hông khi hạ.', 'Ngửa cổ ra trước.']),
  ('superman',
   ARRAY['Nằm sấp, tay duỗi thẳng qua đầu.', 'Nâng cùng lúc tay, ngực và chân khỏi sàn.', 'Giữ 1–2 giây rồi hạ chậm.'],
   ARRAY['Ngửa cổ quá mức.', 'Giật lên quá nhanh.']),
  ('dead-bug',
   ARRAY['Nằm ngửa, tay giơ thẳng lên, gối co 90 độ.', 'Duỗi tay và chân đối diện ra xa, lưng dưới ép sàn.', 'Thu về rồi đổi bên.'],
   ARRAY['Lưng dưới nhấc khỏi sàn.', 'Làm quá nhanh, không kiểm soát.']),
  ('goblet-squat',
   ARRAY['Ôm một quả tạ trước ngực, chân rộng hơn vai.', 'Hạ hông giữa hai gối tới khi đùi ngang sàn.', 'Đạp chân đứng lên, ngực giữ thẳng.'],
   ARRAY['Để tạ kéo người đổ về trước.', 'Gối chụm vào trong.']),
  ('lunge-dumbbell',
   ARRAY['Hai tay cầm tạ đơn buông dọc thân.', 'Bước lùi một chân, hạ tới khi gối sau gần chạm sàn.', 'Đẩy gót chân trước để đứng lên, đổi chân.'],
   ARRAY['Gối trước đổ vào trong.', 'Bước quá ngắn làm gót chân trước nhấc lên.']),
  ('dumbbell-floor-press',
   ARRAY['Nằm ngửa trên sàn, gối co, tạ ngang ngực.', 'Đẩy tạ thẳng lên tới khi tay duỗi hết.', 'Hạ chậm tới khi khuỷu chạm nhẹ sàn.'],
   ARRAY['Khuỷu tay bè ngang vai.', 'Thả rơi khuỷu xuống sàn.']),
  ('one-arm-row',
   ARRAY['Một tay và gối chống lên ghế, lưng thẳng.', 'Kéo tạ về phía hông, khuỷu sát thân.', 'Hạ chậm tới khi tay duỗi hết, đủ rep rồi đổi bên.'],
   ARRAY['Xoay người để kéo.', 'Nhún vai lên tai.']),
  ('biceps-curl',
   ARRAY['Đứng thẳng, tạ buông dọc thân, lòng bàn tay hướng trước.', 'Cuốn tạ lên ngang vai, khuỷu giữ sát thân.', 'Hạ chậm về vị trí đầu.'],
   ARRAY['Đưa người lấy đà.', 'Khuỷu tay trôi ra trước.']),
  ('lateral-raise',
   ARRAY['Đứng thẳng, tạ hai bên thân, khuỷu hơi cong.', 'Nâng tạ sang hai bên tới ngang vai.', 'Hạ chậm, không thả rơi.'],
   ARRAY['Nhún vai khi nâng.', 'Nâng quá vai hoặc lấy đà.']),
  ('kettlebell-swing',
   ARRAY['Chân rộng hơn vai, hai tay cầm tạ ấm.', 'Gập hông đưa tạ ra sau giữa hai chân.', 'Bật hông, siết mông để tạ bay lên ngang ngực.'],
   ARRAY['Dùng tay kéo tạ lên.', 'Squat xuống thay vì gập hông.']),
  ('barbell-bench-press',
   ARRAY['Nằm trên ghế, bả vai ép vào ghế, chân đặt vững.', 'Hạ thanh đòn chạm giữa ngực.', 'Đẩy thẳng lên tới khi tay duỗi hết.'],
   ARRAY['Nảy tạ trên ngực.', 'Nhấc mông khỏi ghế.']),
  ('deadlift',
   ARRAY['Thanh đòn sát ống chân, cúi xuống cầm tạ, lưng thẳng.', 'Đạp chân xuống sàn, kéo tạ sát người lên.', 'Đứng thẳng hẳn rồi hạ tạ theo đường cũ.'],
   ARRAY['Cong lưng khi kéo.', 'Để thanh đòn xa người.'])
) AS v(slug, steps, mistakes)
WHERE e.slug = v.slug;

-- ═══════════════ HƯỚNG DẪN QUAY — màn 8 ═══════════════
-- Góc nên quay lấy từ bảng §6.3 ke-hoach-chi-tiet-chuc-nang-v1.md.
-- F2 còn treo: hình minh hoạ khung người cần chụp hoặc vẽ, không code được.

UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra độ sâu và độ nghiêng thân."}, {"code": "FRONTAL", "label": "Chính diện", "why": "Chính diện — kiểm tra gối có chụm vào trong không."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'barbell-back-squat';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra thân thẳng và độ hạ ngực."}, {"code": "FRONTAL", "label": "Chính diện", "why": "Chính diện — kiểm tra góc khuỷu."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'push-up';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra lưng dưới và đường đi của tạ."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'overhead-press';
UPDATE exercises SET filming_guide = '{"angles": [{"code": "SAGITTAL", "label": "Ngang", "why": "Ngang (bên hông) — kiểm tra hip hinge, lưng thẳng, tạ sát chân."}], "distance": "Đặt điện thoại cách 2–3 m, ngang tầm hông, để toàn bộ cơ thể trong khung từ đầu đến bàn chân.", "lighting": "Ánh sáng từ phía trước hoặc bên. Tránh ngược sáng và tránh quần áo sát màu nền.", "duration": "Mỗi clip 3–5 rep liên tục, khoảng 10–20 giây. Tối đa 30 giây.", "figure": null}'::jsonb WHERE slug = 'romanian-deadlift';
-- ═══════════ KHỚP CẦN KIỂM — số tạm, CHƯA kiểm trên người thật ═══════════
-- doc/design-cham-form-nguong-v1.md §8. Admin chỉnh lại bằng camera ở trang Bài tập.
-- code = góc-số đo-lúc, đúng cách FormCheckService tự sinh. Số chống đẩy, lunge từ
-- analyzer/exercises.py của demo. Trùng mã thì bỏ qua: không ghi đè ngưỡng admin đã hiệu chỉnh, không bật lại khớp admin đã xoá.
INSERT INTO form_checks
  (exercise_id, code, metric, valid_viewpoints, moment, thresholds, name_vi, cue_fail_vi, priority)
SELECT e.id, v.view || '-' || v.measure || '-' || v.moment, v.measure, ARRAY[v.view], v.moment,
       v.thresholds::jsonb, v.name_vi, v.cue, v.priority
FROM exercises e JOIN (VALUES
  ('bodyweight-squat', 'SAGITTAL', 'knee', 'PEAK', '{"from": null, "to": 100, "warn": 15}',
   'Ngồi đủ sâu', 'Hạ hông tới khi đùi song song sàn.', 1),
  ('bodyweight-squat', 'SAGITTAL', 'torso', 'PEAK', '{"from": null, "to": 50, "warn": 10}',
   'Thân không đổ về trước', 'Giữ ngực nâng, đẩy hông ra sau.', 2),
  ('bodyweight-squat', 'FRONTAL', 'valgus', 'PEAK', '{"from": null, "to": 10, "warn": 5}',
   'Gối không chụm', 'Đẩy gối ra theo hướng mũi chân.', 3),
  ('bodyweight-squat', 'FRONTAL', 'asym_knee', 'PEAK', '{"from": null, "to": 10, "warn": 5}',
   'Hai chân xuống đều', 'Dồn đều trọng lượng lên hai chân.', 4),
  ('barbell-back-squat', 'SAGITTAL', 'knee', 'PEAK', '{"from": null, "to": 100, "warn": 15}',
   'Ngồi đủ sâu', 'Hạ hông tới khi đùi song song sàn.', 1),
  ('barbell-back-squat', 'SAGITTAL', 'torso', 'PEAK', '{"from": null, "to": 55, "warn": 10}',
   'Thân không đổ về trước', 'Giữ ngực nâng, đẩy hông ra sau.', 2),
  ('barbell-back-squat', 'FRONTAL', 'valgus', 'PEAK', '{"from": null, "to": 10, "warn": 5}',
   'Gối không chụm', 'Đẩy gối ra theo hướng mũi chân.', 3),
  ('barbell-back-squat', 'FRONTAL', 'asym_knee', 'PEAK', '{"from": null, "to": 10, "warn": 5}',
   'Hai chân xuống đều', 'Dồn đều trọng lượng lên hai chân.', 4),
  ('push-up', 'SAGITTAL', 'elbow', 'PEAK', '{"from": null, "to": 95, "warn": 15}',
   'Hạ ngực đủ sâu', 'Chưa hạ đủ sâu. Hạ ngực xuống cho tới khi khuỷu gập khoảng 90°.', 1),
  ('push-up', 'SAGITTAL', 'line', 'PEAK', '{"from": 165, "to": null, "warn": 10}',
   'Thân thẳng một đường', 'Hông võng xuống hoặc đẩy lên quá cao. Siết bụng và mông để thân thẳng từ vai tới gót.', 2),
  ('reverse-lunge', 'SAGITTAL', 'knee', 'PEAK', '{"from": 80, "to": 110, "warn": 10}',
   'Gối gập khoảng 90°', 'Gối trước gập quá ít hoặc quá nhiều. Bước dài vừa để đùi trước song song sàn.', 1),
  ('reverse-lunge', 'SAGITTAL', 'torso', 'PEAK', '{"from": null, "to": 30, "warn": 15}',
   'Thân giữ thẳng', 'Thân đổ về trước quá nhiều. Giữ ngực nâng, mắt nhìn thẳng.', 2),
  ('reverse-lunge', 'FRONTAL', 'valgus', 'PEAK', '{"from": null, "to": 10, "warn": 5}',
   'Gối trước không chụm', 'Gối trước chụm vào trong khi hạ. Đẩy gối ra theo hướng mũi chân.', 3)
) AS v(slug, view, measure, moment, thresholds, name_vi, cue, priority) ON v.slug = e.slug
ON CONFLICT (exercise_id, code) DO NOTHING;

-- Bài chấm được = có ít nhất một khớp đang bật. FormCheckService giữ cột này khi admin sửa.
UPDATE exercises e SET analyzable = EXISTS (
  SELECT 1 FROM form_checks c WHERE c.exercise_id = e.id AND c.is_active);

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

-- DO NOTHING: Flyway chạy lại file R__ mỗi khi file đổi; DO UPDATE sẽ ghi đè template admin đã sửa
-- trên form (doc/design-template-admin-v1.md §4.3). Seed chỉ tạo template còn thiếu.
ON CONFLICT (slug) DO NOTHING;
