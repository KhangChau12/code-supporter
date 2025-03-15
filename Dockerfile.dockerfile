# Sử dụng Python 3.9 official image - một phiên bản ổn định
FROM python:3.9-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Thiết lập biến môi trường
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    DEBUG=False \
    TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo

# Cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --upgrade together  # Thêm dòng này để đảm bảo cài đặt phiên bản mới nhất

# Copy toàn bộ mã nguồn vào container
COPY . .

# Mở port
EXPOSE $PORT

# Chạy ứng dụng với gunicorn
CMD gunicorn --bind 0.0.0.0:$PORT --workers=4 --threads=2 wsgi:app