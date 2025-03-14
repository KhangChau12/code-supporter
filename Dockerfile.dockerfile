FROM python:3.9-bullseye  # Sử dụng Debian thay vì slim

# Cài đặt dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup default stable && cargo --version

WORKDIR /app

# Sao chép và cài đặt dependencies trước
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép phần còn lại của ứng dụng
COPY . .

# Tạo thư mục data nếu cần
RUN mkdir -p /app/data

# Thiết lập biến môi trường
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DEBUG=False

# Expose port
EXPOSE 8080

# Lệnh chạy ứng dụng
CMD gunicorn --bind $HOST:$PORT wsgi:app