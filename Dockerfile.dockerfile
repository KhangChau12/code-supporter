FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Tạo thư mục data nếu không tồn tại
RUN mkdir -p /app/data

# Thiết lập biến môi trường
ENV PORT=8080
ENV HOST=0.0.0.0
ENV DEBUG=False

# Expose port
EXPOSE 8080

# Command để chạy ứng dụng
CMD gunicorn --bind $HOST:$PORT wsgi:app