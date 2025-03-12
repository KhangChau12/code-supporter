# Code Supporter - Chatbot Lập Trình

Code Supporter là một chatbot hỗ trợ lập trình được xây dựng trên nền tảng mô hình Meta Llama 3.3 70B, giúp học sinh và sinh viên học lập trình thông qua việc giải thích, hướng dẫn cách giải quyết các bài tập và vấn đề lập trình.

## Tính năng

- **Đăng nhập/đăng ký**: Hệ thống quản lý tài khoản người dùng
- **Chat thông minh**: Sử dụng mô hình Meta Llama 3.3 70B để tạo phản hồi 
- **Quản lý API keys**: Tạo và quản lý API keys để tích hợp chatbot vào các trang web khác
- **Widget tích hợp**: JavaScript widget dễ dàng tích hợp vào bất kỳ trang web nào
- **Giao diện đáp ứng**: Thiết kế responsive hoạt động trên cả desktop và mobile
- **Chế độ sáng/tối**: Hỗ trợ cả chế độ giao diện sáng và tối

## Yêu cầu hệ thống

- Python 3.10+ 
- MongoDB (tùy chọn, có thể sử dụng lưu trữ file)
- Together API key (để sử dụng Meta Llama 3.3 70B)

## Cài đặt và chạy

### 1. Clone dự án

```bash
git clone https://github.com/yourusername/code-supporter.git
cd code-supporter
```

### 2. Cài đặt các gói phụ thuộc

```bash
pip install -r requirements.txt
```

### 3. Cấu hình biến môi trường

Tạo file `.env` trong thư mục gốc của dự án với nội dung:

```
# API keys
TOGETHER_API_KEY=your_together_api_key_here
API_SECRET_KEY=your_api_secret_key_for_jwt

# MongoDB connection (tùy chọn)
MONGO_URI=mongodb://localhost:27017/codesupporter

# Server settings
PORT=5000
DEBUG=True
```

### 4. Chạy ứng dụng

```bash
python app.py
```

Truy cập ứng dụng tại địa chỉ: http://localhost:5000

## Tích hợp vào trang web khác

### 1. Thêm script vào trang web của bạn

```html
<script src="https://your-domain.com/static/js/codesupporter-widget.js"></script>
```

### 2. Khởi tạo widget

```html
<script>
    const chatbot = window.initCodeSupporter({
        apiUrl: 'https://your-domain.com/api/chat/public',
        apiKey: 'YOUR_API_KEY_HERE',
        position: 'bottom-right',
        theme: 'dark',
        chatTitle: 'Code Supporter',
        initialMessage: 'Xin chào! Tôi có thể giúp gì cho bạn với bài tập lập trình?'
    });
</script>
```

### 3. Tùy chọn cấu hình widget

| Tham số | Mô tả | Giá trị mặc định |
|---------|-------|-----------------|
| `apiUrl` | URL của API endpoint | `'http://localhost:5000/api/chat/public'` |
| `apiKey` | API key cho xác thực | `null` |
| `position` | Vị trí của widget | `'bottom-right'` |
| `theme` | Giao diện sáng/tối | `'dark'` |
| `chatTitle` | Tiêu đề của cửa sổ chat | `'Code Supporter'` |
| `initialMessage` | Tin nhắn chào mừng | `'Chào bạn! Mình có thể giúp gì...'` |
| `maxHeight` | Chiều cao tối đa của cửa sổ chat | `'500px'` |
| `width` | Chiều rộng của cửa sổ chat | `'350px'` |
| `showOnInit` | Tự động hiển thị chat khi tải trang | `false` |

## Triển khai lên server

### Triển khai trên Heroku

1. Tạo file `Procfile` với nội dung:
   ```
   web: gunicorn app:app
   ```

2. Đăng nhập vào Heroku và triển khai:
   ```bash
   heroku login
   heroku create code-supporter
   git push heroku main
   ```

3. Cấu hình biến môi trường trên Heroku:
   ```bash
   heroku config:set TOGETHER_API_KEY=your_api_key
   heroku config:set API_SECRET_KEY=your_secret_key
   heroku config:set MONGO_URI=your_mongo_connection_string
   ```

### Triển khai bằng Docker

1. Tạo file `Dockerfile` với nội dung:
   ```Dockerfile
   FROM python:3.10-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]
   ```

2. Build và chạy Docker container:
   ```bash
   docker build -t code-supporter .
   docker run -p 5000:5000 --env-file .env code-supporter
   ```

## Cấu trúc dự án

```
code-supporter/
├── api/
│   ├── __init__.py
│   ├── chatbot_service.py - Module dịch vụ chatbot
│   ├── api_service.py - RESTful API endpoints
│   └── storage_service.py - Dịch vụ lưu trữ dữ liệu
├── static/
│   ├── js/
│   │   ├── codesupporter-widget.js - Widget tích hợp
│   │   ├── auth.js - Xử lý đăng nhập/đăng ký
│   │   ├── chat.js - Xử lý chức năng chat
│   │   └── admin.js - Xử lý trang admin
│   └── css/
│       ├── style.css - CSS chung
│       ├── chat.css - CSS trang chat
│       └── admin.css - CSS trang admin
├── templates/
│   ├── index.html - Trang chủ (chuyển hướng)
│   ├── login.html - Trang đăng nhập/đăng ký
│   ├── chat.html - Trang chat
│   └── admin.html - Trang quản trị
├── .env - Cấu hình biến môi trường
├── requirements.txt - Các gói phụ thuộc
└── app.py - File chính để chạy ứng dụng
```

## Phát triển

### Thêm chức năng mới

1. **Thêm tính năng lưu trữ đoạn code mẫu**:
   - Tạo model và API endpoint mới trong `api_service.py`
   - Thêm giao diện quản lý đoạn code mẫu trong admin panel

2. **Thêm tính năng upload file code**:
   - Bổ sung xử lý upload trong `api_service.py`
   - Thêm UI cho việc upload và hiển thị file

### Cải thiện mô hình chatbot

Để cải thiện chất lượng phản hồi, bạn có thể:

1. Điều chỉnh system prompt trong `chatbot_service.py`
2. Thử nghiệm với các tham số khác nhau (temperature, top_p, etc.)
3. Tích hợp các mô hình khác ngoài Meta Llama 3.3 70B

## Bảo mật

- Tất cả mật khẩu được hash trước khi lưu trữ
- API keys được xác thực cho mỗi request
- JWT được sử dụng để xác thực người dùng
- Cross-Origin Resource Sharing (CORS) được cấu hình để bảo vệ API

## Đóng góp

Nếu bạn muốn đóng góp cho dự án, vui lòng:

1. Fork dự án
2. Tạo branch tính năng mới (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi của bạn (`git commit -m 'Add some amazing feature'`)
4. Push lên branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## Giấy phép

Dự án này được cấp phép theo Giấy phép MIT - xem file [LICENSE.md](LICENSE.md) để biết thêm chi tiết.
