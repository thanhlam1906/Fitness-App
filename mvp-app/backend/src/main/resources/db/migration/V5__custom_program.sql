-- Lịch tự thiết kế không sinh từ template nào: người dùng tự chọn bài, set/rep/tạ.
-- scheduled_workouts/scheduled_exercises đã lưu lịch cụ thể nên không cần template
-- để đọc lịch; chỉ progression tự động là cần, và lịch custom cố ý không có.
ALTER TABLE programs
    ALTER COLUMN template_id DROP NOT NULL;
