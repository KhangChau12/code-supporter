# Stage 1: Compile/build dependencies
FROM python:3.10-slim as builder

WORKDIR /app

# Cài đặt công cụ build và Rust
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Upgrade pip và cài đặt wheel
RUN pip install --upgrade pip setuptools wheel

# Copy requirements
COPY requirements.txt .

# Cài đặt dependencies vào thư mục /wheels
RUN pip wheel --no-cache-dir --wheel-dir=/wheels -r requirements.txt

# Stage 2: Final image
FROM python:3.10-slim

WORKDIR /app

# Thiết lập biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    DEBUG=False \
    TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo

# Copy wheels từ builder stage
COPY --from=builder /wheels /wheels

# Cài đặt các gói từ wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels/ /wheels/* && \
    rm -rf /wheels

# Copy code
COPY . .

# Mở port
EXPOSE $PORT

# Chạy ứng dụng với gunicorn
CMD gunicorn --bind 0.0.0.0:$PORT --workers=2 --threads=2 --timeout=120 wsgi:app