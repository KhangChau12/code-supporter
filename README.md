# Code Supporter

Code Supporter là một chatbot thông minh hỗ trợ lập trình viên giải quyết các vấn đề trong quá trình học tập và phát triển phần mềm. Ứng dụng được xây dựng bằng Flask và cung cấp giao diện chat trực quan và API để tích hợp vào các trang web khác.

## Tính năng

- Hệ thống xác thực người dùng với JWT
- Giao diện chat trực quan, hỗ trợ Markdown
- API để tích hợp chatbot vào các ứng dụng khác
- Hệ thống quản lý API key
- Tính năng theo dõi người dùng qua API
- Phân tích dữ liệu sử dụng
- Hỗ trợ cả MongoDB và lưu trữ file (tự động chuyển đổi)
- Chế độ sáng/tối

## Cài đặt

### Yêu cầu
- Python 3.7+
- Pip (Trình quản lý gói Python)
- MongoDB (tùy chọn, hệ thống có thể sử dụng lưu trữ file)
- TogetherAI API Key

### Các bước cài đặt

1. Clone repository:
```bash
git clone https://github.com/yourusername/code-supporter.git
cd code-supporter
```

2. Tạo môi trường ảo và kích hoạt:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate  # Windows
```

3. Cài đặt các gói phụ thuộc:
```bash
pip install -r requirements.txt
```

4. Tạo file .env:
```
DEBUG=True
PORT=5000
API_SECRET_KEY=your_secret_key_here
TOGETHER_API_KEY=your_together_api_key_here
TOGETHER_MODEL_NAME=meta-llama/Llama-3.3-70B-Instruct-Turbo
MONGODB_URI=mongodb://localhost:27017/code_supporter  # Tùy chọn
```

5. Khởi động ứng dụng:
```bash
python app.py
```

## Cấu trúc dự án

```
code-supporter/
├── api/
│   ├── __init__.py
│   ├── chatbot_service.py  # Dịch vụ chatbot
│   ├── api_service.py      # Blueprint API
│   └── storage_service.py  # Dịch vụ lưu trữ
├── static/                 # Tài nguyên tĩnh
│   ├── css/
│   ├── js/
│   └── ...
├── templates/              # Templates HTML
│   ├── login.html
│   ├── chat.html
│   └── admin.html
├── data/                   # Thư mục lưu trữ dữ liệu (khi không dùng MongoDB)
├── app.py                  # Ứng dụng chính
├── wsgi.py                 # Entry point cho WSGI servers
├── requirements.txt        # Các phụ thuộc
└── README.md               # Tài liệu
```

## API Endpoints

### Xác thực và Đăng ký

- `POST /api/register` - Đăng ký người dùng mới
- `POST /api/login` - Đăng nhập
- `GET /api/user/info` - Lấy thông tin người dùng

### Chat API

- `POST /api/chat` - API chat cho người dùng đã xác thực
- `POST /api/chat/stream` - API chat với phản hồi stream
- `POST /api/chat/public` - API chat công khai (yêu cầu API key)
- `POST /api/chat/public/stream` - API chat công khai với phản hồi stream (yêu cầu API key)

### Quản lý API Key

- `POST /api/apikey/create` - Tạo API key mới
- `GET /api/apikey/list` - Danh sách API keys
- `GET /api/apikey/analytics` - Phân tích sử dụng API key

## Lưu trữ dữ liệu

### MongoDB (Khuyến nghị)

Code Supporter hỗ trợ lưu trữ dữ liệu trong MongoDB. Để sử dụng MongoDB:

1. Cài đặt MongoDB hoặc đăng ký MongoDB Atlas (cơ sở dữ liệu đám mây)
2. Đặt biến môi trường `MONGODB_URI` trong file `.env`
3. Khởi động lại ứng dụng

Các collections trong MongoDB:
- `users` - Lưu trữ thông tin người dùng
- `conversations` - Lưu trữ lịch sử hội thoại
- `api_keys` - Lưu trữ API keys
- `api_users` - Lưu trữ thông tin người dùng qua API

### Lưu trữ file (Fallback)

Nếu không cấu hình MongoDB, hệ thống sẽ tự động chuyển sang lưu trữ file trong thư mục `data/`:
- `data/users/` - Lưu trữ thông tin người dùng
- `data/conversations/` - Lưu trữ lịch sử hội thoại
- `data/api_keys/` - Lưu trữ API keys
- `data/api_users/` - Lưu trữ thông tin người dùng qua API

## Triển khai

### Triển khai trên Render

1. Tạo một dịch vụ Web mới trên Render
2. Liên kết với repository GitHub của bạn
3. Thiết lập như sau:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn wsgi:app`
4. Thêm các biến môi trường trong tab Environment

### Sử dụng Docker

1. Xây dựng image:
```bash
docker build -t code-supporter .
```

2. Chạy container:
```bash
docker run -p 5000:5000 \
  -e API_SECRET_KEY=your_secret_key_here \
  -e TOGETHER_API_KEY=your_together_api_key_here \
  -e MONGODB_URI=mongodb://your-mongodb-uri \
  code-supporter
```

Hoặc sử dụng Docker Compose:
```bash
docker-compose up -d
```

## Tích hợp vào trang web khác

### Sử dụng Widget

1. Thêm script widget vào trang web của bạn:
```html
<script src="https://your-domain.com/static/js/codesupporter-widget.js"></script>
```

2. Khởi tạo widget với API key:
```html
<script>
const chatbot = window.initCodeSupporter({
    apiUrl: 'https://your-domain.com/api/chat/public',
    apiKey: 'YOUR_API_KEY_HERE', // Thay thế bằng API Key của bạn
    position: 'bottom-right',
    theme: 'dark',
    chatTitle: 'Code Supporter',
    initialMessage: 'Xin chào! Tôi có thể giúp gì cho bạn với bài tập lập trình?',
    userId: 'user123', // Tùy chọn: ID người dùng để theo dõi
    userInfo: {  // Tùy chọn: Thông tin bổ sung về người dùng
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com' 
    }
});
</script>
```

### Sử dụng REST API

Gọi API trực tiếp:

```javascript
fetch('https://your-domain.com/api/chat/public', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'YOUR_API_KEY_HERE'
    },
    body: JSON.stringify({
        message: "Làm thế nào để viết hàm đệ quy tính giai thừa trong Python?",
        user_id: "user123",  // Tùy chọn
        user_info: {  // Tùy chọn
            name: "Nguyễn Văn A",
            email: "nguyenvana@example.com"
        }
    })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Quản lý API Keys

API keys được sử dụng để xác thực các yêu cầu API từ các ứng dụng bên ngoài. Để quản lý API keys:

1. Đăng nhập vào Code Supporter
2. Chuyển đến trang Admin
3. Tạo API key mới và cấp quyền hạn phù hợp
4. Sử dụng API key trong header `X-API-Key` khi gọi API

## Phân tích dữ liệu

Code Supporter cung cấp trang phân tích dữ liệu trong phần Admin để theo dõi:

- Số lượng người dùng qua API
- Số lượng yêu cầu API
- Người dùng hoạt động trong 24h và 7 ngày qua
- Thông tin chi tiết về người dùng

## Lưu ý về API Key và API Secret

Khi tạo API key mới, hệ thống sẽ cung cấp cho bạn:
- **API Key**: Sử dụng trong header `X-API-Key` khi gọi API hoặc trong khởi tạo widget
- **API Secret**: Mã bí mật, tương tự như mật khẩu, chỉ hiển thị một lần duy nhất

Trong việc tích hợp, bạn chỉ cần sử dụng **API Key**, không cần API Secret.

## Giấy phép

Dự án này được phân phối dưới Giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## Liên hệ

Nếu bạn có bất kỳ câu hỏi hoặc đề xuất nào, vui lòng liên hệ [email@example.com].