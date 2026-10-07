# opencv-python-headless -> khong can libGL, tranh han nhom loi do
# (concept-analyzer-v1.md SS10).
FROM python:3.12-slim

WORKDIR /app

# mediapipe (qua opencv) van doi vai shared lib du dung ban headless.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxcb1 libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 libegl1 libgles2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/
ENV PYTHONPATH=/app/src PYTHONUNBUFFERED=1

# Model .task tai ve lan chay dau vao volume nay, khong nam trong image.
VOLUME ["/app/models"]

CMD ["python", "-m", "analyzer"]
