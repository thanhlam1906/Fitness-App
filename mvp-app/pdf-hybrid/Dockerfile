# Máy trích PDF chế độ hybrid cho kho kiến thức trợ lý (doc/design-nap-tai-lieu-v1.md §6).
# Chỉ là server Docling: phần chia trang dễ/khó chạy trong backend (thư viện Java OpenDataLoader).
FROM python:3.12-slim

# torch bản CPU cài trước: để pip tự chọn sẽ kéo bản CUDA vài GB, máy dev không có GPU.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision \
    && pip install --no-cache-dir "opendataloader-pdf[hybrid]==2.5.12"

# EasyOCR kéo opencv bản đầy đủ, cần thư viện X/GL dù không có màn hình. Thiếu thì Docling báo
# "EasyOCR is not installed" và trang ảnh quét ra rỗng. Đặt sau pip để build lại không tải lại torch.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libice6 libx11-6 libxext6 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Model Docling (Hugging Face) và EasyOCR tải ở lần trích đầu vào volume, không nằm trong image,
# bật lại container không tải lại.
ENV HF_HOME=/models/hf EASYOCR_MODULE_PATH=/models/easyocr PYTHONUNBUFFERED=1
VOLUME ["/models"]

EXPOSE 5002
# --heading-hierarchy: tiêu đề ra đủ cấp #/##/### thay vì toàn cấp 1, bộ cắt đoạn dựa vào đó.
# Không bật --enrich-picture-description: mô tả ảnh do model sinh sẽ thành "kiến thức" của trợ lý.
CMD ["opendataloader-pdf-hybrid", "--port", "5002", "--heading-hierarchy"]
