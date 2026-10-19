-- Màn chấm form nạp góc quay của 20 lần chấm gần nhất theo request_id ở mỗi lần poll (5 s khi còn lần đang chấm).
-- Clip chỉ xoá mềm nên bảng lớn mãi, và Postgres không tự tạo index cho khoá ngoại: thiếu index là quét cả bảng.
CREATE INDEX ON video_clips (request_id);
