"""
Code Supporter - Ứng dụng chính
Cập nhật: Cấu hình MongoDB tốt hơn
"""
from flask import Flask, render_template, request, redirect, url_for, jsonify, make_response
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
from functools import wraps

from api.chatbot_service import CodeSupporterService
from api.storage_service import StorageService
from api.api_service import api_bp  # Import Blueprint thay vì app

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

app = Flask(__name__, 
           template_folder='templates',
           static_folder='static')
# Thay đổi cấu hình CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*", 
        "allow_headers": ["Content-Type", "X-API-Key", "Authorization"],
        "methods": ["GET", "POST", "OPTIONS"],
        "supports_credentials": True
    }
}, supports_credentials=True)

# Secret key cho JWT
SECRET_KEY = os.getenv('API_SECRET_KEY', 'default_secret_key')

# Khởi tạo các dịch vụ
chatbot_service = CodeSupporterService()
storage_service = StorageService()

# --- Decorator xác thực ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('token')
        
        if not token:
            return redirect(url_for('login_page'))
        
        try:
            # Giải mã token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = data['username']
        except jwt.ExpiredSignatureError:
            # Token hết hạn
            logger.info(f"Token hết hạn, chuyển hướng đến trang đăng nhập")
            return redirect(url_for('login_page'))
        except jwt.InvalidTokenError:
            # Token không hợp lệ
            logger.warning(f"Token không hợp lệ, chuyển hướng đến trang đăng nhập")
            return redirect(url_for('login_page'))
        except Exception as e:
            # Lỗi khác
            logger.error(f"Lỗi xác thực token: {str(e)}")
            return redirect(url_for('login_page'))
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# --- Routes ---

@app.route('/')
def home():
    """Trang chủ - chuyển hướng đến trang đăng nhập"""
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    """Hiển thị trang đăng nhập/đăng ký"""
    # Kiểm tra nếu đã có token hợp lệ thì chuyển hướng đến trang chat
    token = request.cookies.get('token')
    if token:
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            return redirect(url_for('chat_page'))
        except:
            # Token không hợp lệ, tiếp tục hiển thị trang đăng nhập
            pass
    
    return render_template('login.html')

@app.route('/chat')
@token_required
def chat_page(current_user):
    """Hiển thị trang chat sau khi đăng nhập"""
    return render_template('chat.html', username=current_user)

@app.route('/admin')
@token_required
def admin_page(current_user):
    """Trang admin để quản lý API keys"""
    return render_template('admin.html', username=current_user)

# Đăng ký Blueprint API
app.register_blueprint(api_bp, url_prefix='/api')

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,X-API-Key,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        return response

# --- Khởi động ứng dụng ---
if __name__ == '__main__':
    # Lấy cấu hình từ biến môi trường
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    # Khởi động ứng dụng
    logger.info(f"Khởi động ứng dụng trên cổng {port}, chế độ debug: {debug}")
    logger.info(f"Kiểu lưu trữ: {storage_service.storage_type}")
    
    if storage_service.storage_type == "mongodb":
        logger.info("Đã kết nối thành công với MongoDB")
    else:
        logger.warning("Sử dụng lưu trữ file. Để sử dụng MongoDB, hãy đặt biến môi trường MONGODB_URI")
    
    app.run(host='0.0.0.0', port=port, debug=debug)