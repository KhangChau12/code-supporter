"""
API Service - Cung cấp RESTful API cho ứng dụng Code Supporter
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import logging
import json
import jwt
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv

from .chatbot_service import CodeSupporterService
from .storage_service import StorageService

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

# Secret key cho JWT
SECRET_KEY = os.getenv('API_SECRET_KEY', 'default_secret_key')

# Khởi tạo các dịch vụ
chatbot_service = CodeSupporterService()
storage_service = StorageService()

# --- Decorator xác thực ---

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Lấy token từ header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Không tìm thấy token!'}), 401
        
        try:
            # Giải mã token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = data['username']
        except:
            return jsonify({'message': 'Token không hợp lệ!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

def api_key_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = None
        
        # Lấy API key từ header hoặc query string
        if 'X-API-Key' in request.headers:
            api_key = request.headers['X-API-Key']
        elif request.args.get('api_key'):
            api_key = request.args.get('api_key')
        
        if not api_key:
            return jsonify({'message': 'Không tìm thấy API key!'}), 401
        
        # Xác thực API key
        is_valid, permissions = storage_service.verify_api_key(api_key)
        
        if not is_valid:
            return jsonify({'message': 'API key không hợp lệ!'}), 401
        
        # Kiểm tra quyền
        required_permission = kwargs.get('permission', 'chat')
        if required_permission not in permissions:
            return jsonify({'message': 'API key không có quyền truy cập!'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

# --- Các API endpoint ---

@app.route('/api/health', methods=['GET'])
def health_check():
    """API kiểm tra trạng thái hoạt động của hệ thống"""
    return jsonify({
        "status": "online",
        "service": "Code Supporter API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/register', methods=['POST'])
def register():
    """API đăng ký tài khoản"""
    try:
        data = request.json
        
        if not data or "username" not in data or "password" not in data:
            return jsonify({"error": "Thiếu thông tin đăng ký"}), 400
        
        username = data.get("username")
        password = data.get("password")
        
        # Kiểm tra độ dài username và password
        if len(username) < 3 or len(password) < 6:
            return jsonify({"error": "Tên đăng nhập phải có ít nhất 3 ký tự và mật khẩu phải có ít nhất 6 ký tự"}), 400
        
        # Tạo tài khoản
        success, message = storage_service.create_user(username, password)
        
        if success:
            # Tạo token JWT
            token = jwt.encode({
                'username': username,
                'exp': datetime.utcnow() + timedelta(days=1)
            }, SECRET_KEY, algorithm="HS256")
            
            return jsonify({
                "message": message,
                "token": token
            }), 201
        else:
            return jsonify({"error": message}), 400
            
    except Exception as e:
        logger.error(f"Lỗi đăng ký: {str(e)}")
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """API đăng nhập"""
    try:
        data = request.json
        
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Thiếu tên đăng nhập hoặc mật khẩu"}), 400
        
        # Xác thực người dùng
        if storage_service.authenticate_user(username, password):
            # Tạo token JWT
            token = jwt.encode({
                'username': username,
                'exp': datetime.utcnow() + timedelta(days=1)
            }, SECRET_KEY, algorithm="HS256")
            
            return jsonify({
                "message": "Đăng nhập thành công",
                "token": token,
                "username": username
            }), 200
        else:
            return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401
            
    except Exception as e:
        logger.error(f"Lỗi đăng nhập: {str(e)}")
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500

@app.route('/api/chat', methods=['POST'])
@token_required
def chat_authenticated(current_user):
    """API chat yêu cầu xác thực người dùng"""
    try:
        data = request.json
        user_message = data.get("message")
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Lấy lịch sử hội thoại
        conversation_history = storage_service.get_conversation_history(current_user, limit=10)
        
        # Gọi service để tạo phản hồi
        bot_reply = chatbot_service.generate_response(user_message, conversation_history)
        
        # Lưu tin nhắn vào lịch sử
        storage_service.save_conversation(current_user, "user", user_message)
        storage_service.save_conversation(current_user, "assistant", bot_reply)
        
        return jsonify({
            "reply": bot_reply,
            "status": "success"
        })
        
    except Exception as e:
        logger.error(f"Lỗi chat: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/chat/stream', methods=['POST'])
@token_required
def chat_stream(current_user):
    """API chat với phản hồi stream"""
    try:
        data = request.json
        user_message = data.get("message")
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Lấy lịch sử hội thoại
        conversation_history = storage_service.get_conversation_history(current_user, limit=10)
        
        # Lưu tin nhắn người dùng
        storage_service.save_conversation(current_user, "user", user_message)
        
        def generate():
            full_response = ""
            
            # Stream phản hồi từ mô hình
            for text_chunk in chatbot_service.generate_response_stream(user_message, conversation_history):
                full_response += text_chunk
                yield f"data: {json.dumps({'chunk': text_chunk, 'done': False})}\n\n"
            
            # Lưu phản hồi đầy đủ vào lịch sử
            storage_service.save_conversation(current_user, "assistant", full_response)
            
            # Gửi thông báo hoàn thành
            yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Lỗi chat stream: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/chat/public', methods=['POST'])
@api_key_required
def chat_public():
    """API chat công khai, yêu cầu API key"""
    try:
        data = request.json
        user_message = data.get("message")
        session_id = data.get("session_id", "public")
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Lấy lịch sử hội thoại (nếu có)
        conversation_history = data.get("conversation_history", [])
        
        # Gọi service để tạo phản hồi
        bot_reply = chatbot_service.generate_response(user_message, conversation_history)
        
        return jsonify({
            "reply": bot_reply,
            "status": "success"
        })
        
    except Exception as e:
        logger.error(f"Lỗi chat public: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@app.route('/api/apikey/create', methods=['POST'])
@token_required
def create_api_key(current_user):
    """API tạo API key mới"""
    try:
        data = request.json
        name = data.get("name", f"API key for {current_user}")
        permissions = data.get("permissions", ["chat"])
        
        # Tạo API key mới
        api_key, api_secret = storage_service.create_api_key(name, permissions)
        
        if not api_key or not api_secret:
            return jsonify({"error": "Không thể tạo API key"}), 500
        
        return jsonify({
            "api_key": api_key,
            "api_secret": api_secret,
            "message": "Tạo API key thành công"
        }), 201
        
    except Exception as e:
        logger.error(f"Lỗi tạo API key: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

# --- Khởi động ứng dụng ---

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug)