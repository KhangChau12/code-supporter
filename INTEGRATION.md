# Hướng dẫn tích hợp Code Supporter

Tài liệu này hướng dẫn chi tiết cách tích hợp Code Supporter Chatbot vào trang web, ứng dụng hoặc nền tảng học tập của bạn.

## Mục lục
- [Tổng quan](#tổng-quan)
- [Tạo API Key](#tạo-api-key)
- [Sử dụng JavaScript Widget](#sử-dụng-javascript-widget)
- [Gọi API trực tiếp](#gọi-api-trực-tiếp)
- [Tùy chỉnh Widget](#tùy-chỉnh-widget)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Ví dụ tích hợp](#ví-dụ-tích-hợp)

## Tổng quan

Code Supporter cung cấp hai cách chính để tích hợp:

1. **JavaScript Widget**: Cách đơn giản nhất để thêm chatbot vào trang web
2. **API Endpoints**: Cho phép tùy chỉnh hoàn toàn trải nghiệm người dùng

## Tạo API Key

Trước khi bắt đầu tích hợp, bạn cần tạo API Key:

1. Đăng nhập vào hệ thống Code Supporter
2. Chuyển đến trang Admin
3. Trong phần "Quản lý API Key", nhập tên cho API key mới
4. Chọn quyền hạn cần thiết:
   - **Chat API**: Cho phép gọi API chat cơ bản
   - **Stream API**: Cho phép gọi API chat với phản hồi kiểu stream
5. Nhấn "Tạo API Key"
6. Lưu lại cả API Key và API Secret (API Secret sẽ không hiển thị lại sau khi rời khỏi trang)

## Sử dụng JavaScript Widget

### Thêm Script

Thêm đoạn mã sau vào phần `<head>` hoặc cuối `<body>` của trang web:

```html
<script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
```

### Khởi tạo Widget

Thêm đoạn mã sau để khởi tạo widget:

```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const chatbot = window.initCodeSupporter({
            apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
            apiKey: 'YOUR_API_KEY_HERE',
            position: 'bottom-right',
            theme: 'dark',
            chatTitle: 'Code Supporter',
            initialMessage: 'Xin chào! Tôi có thể giúp gì cho bạn với bài tập lập trình?'
        });
    });
</script>
```

## Gọi API trực tiếp

Nếu bạn muốn tùy chỉnh giao diện hoàn toàn, bạn có thể gọi API trực tiếp.

### API Chat

**Endpoint**: `POST /api/chat/public`

**Headers**:
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY_HERE
```

**Request Body**:
```json
{
    "message": "Làm thế nào để viết hàm đệ quy tính giai thừa trong Python?",
    "conversation_history": [
        {"role": "user", "content": "Xin chào"},
        {"role": "assistant", "content": "Xin chào! Tôi có thể giúp gì cho bạn?"}
    ],
    "session_id": "unique-session-id-123"
}
```

**Giải thích các trường**:
- `message`: Tin nhắn của người dùng
- `conversation_history` (tùy chọn): Lịch sử hội thoại để duy trì ngữ cảnh
- `session_id` (tùy chọn): ID định danh phiên chat

**Response**:
```json
{
    "reply": "Để viết hàm đệ quy tính giai thừa trong Python, bạn có thể làm như sau:\n\n```python\ndef factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    else:\n        return n * factorial(n-1)\n```\n\nHàm này hoạt động bằng cách...",
    "status": "success"
}
```

### API Chat Stream

**Endpoint**: `POST /api/chat/stream`

**Headers**: Giống như API Chat

**Request Body**: Giống như API Chat

**Response**: Phản hồi dạng Server-Sent Events (SSE) với từng phần của câu trả lời được gửi theo thời gian thực.

## Tùy chỉnh Widget

Widget có nhiều tùy chọn để phù hợp với thiết kế trang web của bạn:

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
| `sessionId` | ID phiên để lưu trữ hội thoại | `random ID` |

### Các tùy chọn nâng cao

Bạn có thể truy cập các phương thức của widget sau khi khởi tạo:

```javascript
const chatbot = window.initCodeSupporter({...});

// Hiển thị cửa sổ chat theo yêu cầu
document.getElementById('help-button').addEventListener('click', function() {
    chatbot.toggleChatWindow(true);
});

// Gửi tin nhắn tự động
chatbot.addMessage("Tôi cần hỗ trợ về vòng lặp for trong Python", "user");
```

## Xử lý lỗi thường gặp

### CORS (Cross-Origin Resource Sharing)

Nếu gặp lỗi CORS khi gọi API từ domain khác, hãy kiểm tra:

1. Domain của bạn đã được thêm vào danh sách cho phép CORS chưa
2. Headers `X-API-Key` và `Content-Type` đã được cấu hình đúng chưa

### Kết nối API thất bại

Nếu không thể kết nối đến API:

1. Kiểm tra API Key có hợp lệ không
2. Đảm bảo URL API chính xác
3. Kiểm tra console của trình duyệt để xem lỗi cụ thể

## Ví dụ tích hợp

### Tích hợp vào trang web tĩnh

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trang Web Của Tôi</title>
    <!-- Stylesheet của trang web -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Trang Web Học Lập Trình</h1>
        <!-- Menu điều hướng -->
    </header>
    
    <main>
        <!-- Nội dung trang web -->
    </main>
    
    <footer>
        <!-- Footer -->
    </footer>
    
    <!-- Tích hợp Code Supporter -->
    <script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const chatbot = window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark',
                position: 'bottom-right'
            });
            
            // Tùy chọn: Kích hoạt chat khi người dùng nhấn nút "Trợ giúp"
            document.getElementById('help-button').addEventListener('click', function() {
                chatbot.toggleChatWindow(true);
            });
        });
    </script>
</body>
</html>
```

### Tích hợp vào React

```jsx
import React, { useEffect } from 'react';

function App() {
    useEffect(() => {
        // Thêm script
        const script = document.createElement('script');
        script.src = 'https://your-code-supporter-domain.com/static/js/codesupporter-widget.js';
        script.async = true;
        script.onload = () => {
            // Khởi tạo widget khi script được tải
            window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark'
            });
        };
        document.body.appendChild(script);
        
        // Cleanup khi component unmount
        return () => {
            document.body.removeChild(script);
        };
    }, []);
    
    return (
        <div className="App">
            {/* Nội dung ứng dụng React */}
        </div>
    );
}

export default App;
```

### Tích hợp vào WordPress

Thêm đoạn mã sau vào file theme's functions.php hoặc sử dụng plugin để chèn code:

```php
function add_code_supporter_widget() {
    ?>
    <script src="https://your-code-supporter-domain.com/static/js/codesupporter-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.initCodeSupporter({
                apiUrl: 'https://your-code-supporter-domain.com/api/chat/public',
                apiKey: 'YOUR_API_KEY_HERE',
                theme: 'dark'
            });
        });
    </script>
    <?php
}
add_action('wp_footer', 'add_code_supporter_widget');
```

## Phiên bản API

| Phiên bản | Ngày phát hành | Thay đổi |
|-----------|----------------|----------|
| v1.0.0    | 01/01/2025     | Phiên bản ban đầu |

## Hỗ trợ

Nếu bạn cần hỗ trợ thêm về tích hợp, vui lòng liên hệ chúng tôi tại:
- Email: support@codesupporter.example.com
- GitHub Issues: https://github.com/yourusername/code-supporter/issues
