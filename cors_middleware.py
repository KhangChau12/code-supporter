class CORSMiddleware:
    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        # Kiểm tra nếu là OPTIONS request
        if environ['REQUEST_METHOD'] == 'OPTIONS':
            # Tạo response cho OPTIONS
            headers = [
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization'),
                ('Access-Control-Max-Age', '86400'),  # 24 giờ
                ('Content-Type', 'text/plain'),
                ('Content-Length', '0')
            ]
            start_response('200 OK', headers)
            return [b'']  # Trả về body rỗng

        # Xử lý response cho các request khác
        def custom_start_response(status, headers, exc_info=None):
            # Thêm CORS headers vào response
            cors_headers = [
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization')
            ]
            
            # Kết hợp headers hiện có với CORS headers
            new_headers = list(headers) + cors_headers
            
            # Gọi hàm start_response ban đầu với headers đã được cập nhật
            return start_response(status, new_headers, exc_info)
        
        return self.app(environ, custom_start_response)