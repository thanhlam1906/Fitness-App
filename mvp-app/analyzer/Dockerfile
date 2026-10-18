# syntax=docker/dockerfile:1.7
# opencv-python-headless -> khong can libGL, tranh han nhom loi do
# (concept-analyzer-v1.md SS10).
FROM python:3.12.15-slim-trixie

WORKDIR /app

# mediapipe (qua opencv) van doi vai shared lib du dung ban headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxcb1 libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 libegl1 libgles2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Model nằm sẵn trong image: chấm form không phụ thuộc mạng lúc chạy. --checksum ghim đúng file đang dùng
# ở dev (URL "latest" mà đổi thì build đỏ, không lặng lẽ đổi model). ensure_model thấy file có sẵn thì
# không tải. File tải bằng ADD mặc định quyền 600 của root, nên mở 644 cho user chạy đọc được (bẫy 1.8).
# Tạo thư mục trước: để ADD tự tạo thì thư mục cũng nhận 644, mất quyền đi vào (thấy khi build 10-18).
RUN mkdir /app/models
ADD --chmod=644 \
    --checksum=sha256:4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad \
    https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task \
    /app/models/pose_landmarker_full.task

COPY src/ src/
ENV PYTHONPATH=/app/src PYTHONUNBUFFERED=1

# Không chạy bằng root. uid 1000 trùng backend: hai bên cùng ghi và xoá trong thư mục clip /data
# (volume dùng chung, bẫy 1.11). Volume mới rỗng được Docker chép thư mục này từ image vào.
RUN useradd --uid 1000 --create-home app && mkdir /data && chown 1000:1000 /data
USER 1000:1000

CMD ["python", "-m", "analyzer"]
