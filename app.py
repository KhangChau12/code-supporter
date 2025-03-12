"""
Code Supporter - Ứng dụng chính
"""
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_cors import CORS
import os
import logging
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
from functools import wraps

from api.chatbot_service import CodeSupporterService
from api.storage_service import StorageService
from api.api_service import app as api_app

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
CORS(app, supports_credentials=True)

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
        except:
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

# --- Đăng ký các blueprint ---
# QUAN TRỌNG: Di chuyển việc đăng ký blueprint ra khỏi block if __name__ == '__main__':

def register_blueprints(app):
    """Đăng ký các blueprint"""
    app.register_blueprint(api_app, url_prefix='/api')

# Đăng ký các blueprint NGAY TẠI ĐÂY để đảm bảo luôn được thực thi
register_blueprints(app)

# --- Khởi động ứng dụng ---
if __name__ == '__main__':
    # Lấy cấu hình từ biến môi trường
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    
    # Khởi động ứng dụng
    logger.info(f"Khởi động ứng dụng trên cổng {port}, chế độ debug: {debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)