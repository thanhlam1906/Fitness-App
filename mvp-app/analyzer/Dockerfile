# opencv-python-headless -> khong can libGL, tranh han nhom loi do
# (concept-analyzer-v1.md SS10).
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ src/
ENV PYTHONPATH=/app/src PYTHONUNBUFFERED=1

# Model .task tai ve lan chay dau vao volume nay, khong nam trong image.
VOLUME ["/app/models"]

CMD ["python", "-m", "analyzer"]
