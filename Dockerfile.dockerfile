FROM python:3.9-slim

# Cài đặt các dependencies cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Sao chép và cài đặt dependencies trước
COPY requirements.txt .

# Cài đặt packages với --prefer-binary để ưu tiên sử dụng wheels
RUN pip install --no-cache-dir --prefer-binary -r requirements.txt

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