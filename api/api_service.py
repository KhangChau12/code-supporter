"""
API Service - Cung cấp RESTful API cho ứng dụng Code Supporter
Cập nhật: Thêm track API users, xử lý MongoDB tốt hơn và hỗ trợ quản lý hội thoại
"""
from flask import Blueprint, request, jsonify, Response
import os
import logging
import json
import jwt
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv
from typing import Dict, List, Optional, Any, Union, Tuple
import uuid

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

# Tạo Blueprint thay vì Flask app
api_bp = Blueprint('api', __name__)

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
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token đã hết hạn!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token không hợp lệ!'}), 401
        except Exception as e:
            logger.error(f"Lỗi xác thực token: {str(e)}")
            return jsonify({'message': 'Lỗi xác thực!'}), 401
        
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
        
        # Lưu API key để sử dụng trong hàm
        kwargs['api_key'] = api_key
        
        return f(*args, **kwargs)
    
    return decorated

# --- API endpoints cho quản lý hội thoại ---

@api_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user):
    """Lấy danh sách tất cả các hội thoại của người dùng"""
    try:
        # Lấy các tham số query
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Lấy danh sách hội thoại từ storage service
        conversations = storage_service.get_conversations(current_user, limit=limit, offset=offset)
        
        # Chuẩn bị dữ liệu phản hồi
        conversations_data = []
        for conv in conversations:
            # Lấy một vài tin nhắn gần nhất để tạo preview
            preview = ""
            if conv.get("last_message"):
                preview = conv["last_message"].get("content", "")[:100]  # Giới hạn 100 ký tự cho preview
            
            # Định dạng dữ liệu hội thoại
            conversation_data = {
                "id": conv.get("id"),
                "title": conv.get("title") or "Hội thoại không có tiêu đề",
                "created_at": conv.get("created_at"),
                "updated_at": conv.get("updated_at"),
                "message_count": conv.get("message_count", 0),
                "preview": preview
            }
            conversations_data.append(conversation_data)
        
        return jsonify({
            "conversations": conversations_data,
            "count": len(conversations_data),
            "total": storage_service.get_conversations_count(current_user)
        })
        
    except Exception as e:
        logger.error(f"Lỗi khi lấy danh sách hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/conversations/<conversation_id>', methods=['GET'])
@token_required
def get_conversation(current_user, conversation_id):
    """Lấy chi tiết một hội thoại cụ thể"""
    try:
        # Kiểm tra quyền truy cập hội thoại
        if not storage_service.check_conversation_access(current_user, conversation_id):
            return jsonify({"error": "Bạn không có quyền truy cập hội thoại này"}), 403
        
        # Lấy thông tin hội thoại
        conversation = storage_service.get_conversation(conversation_id)
        if not conversation:
            return jsonify({"error": "Không tìm thấy hội thoại"}), 404
        
        # Lấy tin nhắn của hội thoại
        messages = storage_service.get_conversation_messages(conversation_id)
        
        # Chuẩn bị dữ liệu phản hồi
        conversation_data = {
            "id": conversation.get("id"),
            "title": conversation.get("title") or "Hội thoại không có tiêu đề",
            "created_at": conversation.get("created_at"),
            "updated_at": conversation.get("updated_at"),
            "message_count": len(messages)
        }
        
        # Định dạng tin nhắn
        messages_data = []
        for message in messages:
            message_data = {
                "id": message.get("id"),
                "role": message.get("role"),
                "content": message.get("content"),
                "timestamp": message.get("timestamp")
            }
            messages_data.append(message_data)
        
        return jsonify({
            "conversation": conversation_data,
            "messages": messages_data
        })
        
    except Exception as e:
        logger.error(f"Lỗi khi lấy chi tiết hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/conversations/<conversation_id>', methods=['PUT'])
@token_required
def update_conversation(current_user, conversation_id):
    """Cập nhật thông tin hội thoại"""
    try:
        # Kiểm tra quyền truy cập hội thoại
        if not storage_service.check_conversation_access(current_user, conversation_id):
            return jsonify({"error": "Bạn không có quyền truy cập hội thoại này"}), 403
        
        data = request.json
        if not data:
            return jsonify({"error": "Không có dữ liệu cập nhật"}), 400
        
        # Chỉ cho phép cập nhật một số trường nhất định
        allowed_fields = ["title"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({"error": "Không có trường hợp lệ để cập nhật"}), 400
        
        # Cập nhật hội thoại
        success = storage_service.update_conversation(conversation_id, update_data)
        
        if success:
            return jsonify({
                "message": "Cập nhật hội thoại thành công",
                "status": "success"
            })
        else:
            return jsonify({"error": "Không thể cập nhật hội thoại"}), 500
        
    except Exception as e:
        logger.error(f"Lỗi khi cập nhật hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
@token_required
def delete_conversation(current_user, conversation_id):
    """Xóa một hội thoại"""
    try:
        # Kiểm tra quyền truy cập hội thoại
        if not storage_service.check_conversation_access(current_user, conversation_id):
            return jsonify({"error": "Bạn không có quyền truy cập hội thoại này"}), 403
        
        # Xóa hội thoại
        success = storage_service.delete_conversation(conversation_id)
        
        if success:
            return jsonify({
                "message": "Xóa hội thoại thành công",
                "status": "success"
            })
        else:
            return jsonify({"error": "Không thể xóa hội thoại"}), 500
        
    except Exception as e:
        logger.error(f"Lỗi khi xóa hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/conversations', methods=['DELETE'])
@token_required
def delete_all_conversations(current_user):
    """Xóa tất cả hội thoại của người dùng"""
    try:
        # Xóa tất cả hội thoại
        success = storage_service.delete_all_conversations(current_user)
        
        if success:
            return jsonify({
                "message": "Xóa tất cả hội thoại thành công",
                "status": "success"
            })
        else:
            return jsonify({"error": "Không thể xóa hội thoại"}), 500
        
    except Exception as e:
        logger.error(f"Lỗi khi xóa tất cả hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

# --- API endpoints cho chat ---

@api_bp.route('/chat', methods=['POST'])
@token_required
def chat_authenticated(current_user):
    """API chat yêu cầu xác thực người dùng"""
    try:
        data = request.json
        user_message = data.get("message")
        conversation_id = data.get("conversation_id")  # ID hội thoại nếu tiếp tục hội thoại cũ
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Kiểm tra quyền truy cập hội thoại nếu có conversation_id
        if conversation_id and not storage_service.check_conversation_access(current_user, conversation_id):
            return jsonify({"error": "Bạn không có quyền truy cập hội thoại này"}), 403
        
        # Lấy lịch sử hội thoại
        conversation_history = []
        if conversation_id:
            # Nếu có conversation_id, lấy tin nhắn từ hội thoại đó
            messages = storage_service.get_conversation_messages(conversation_id)
            conversation_history = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        else:
            # Tạo hội thoại mới nếu không có conversation_id
            conversation_title = "Hội thoại " + datetime.now().strftime("%d/%m/%Y %H:%M")
            conversation_id = storage_service.create_conversation(current_user, title=conversation_title)
        
        # Lưu tin nhắn người dùng vào hội thoại
        storage_service.add_message_to_conversation(conversation_id, "user", user_message)
        
        # Gọi service để tạo phản hồi
        bot_reply = chatbot_service.generate_response(user_message, conversation_history)
        
        # Lưu phản hồi vào hội thoại
        storage_service.add_message_to_conversation(conversation_id, "assistant", bot_reply)
        
        return jsonify({
            "reply": bot_reply,
            "conversation_id": conversation_id,
            "status": "success"
        })
        
    except Exception as e:
        logger.error(f"Lỗi chat: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/chat/stream', methods=['POST'])
@token_required
def chat_stream(current_user):
    """API chat với phản hồi stream"""
    try:
        data = request.json
        user_message = data.get("message")
        conversation_id = data.get("conversation_id")  # ID hội thoại nếu tiếp tục hội thoại cũ
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Kiểm tra quyền truy cập hội thoại nếu có conversation_id
        if conversation_id and not storage_service.check_conversation_access(current_user, conversation_id):
            return jsonify({"error": "Bạn không có quyền truy cập hội thoại này"}), 403
        
        # Lấy lịch sử hội thoại
        conversation_history = []
        if conversation_id:
            # Nếu có conversation_id, lấy tin nhắn từ hội thoại đó
            messages = storage_service.get_conversation_messages(conversation_id)
            conversation_history = [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        else:
            # Tạo hội thoại mới nếu không có conversation_id
            conversation_title = "Hội thoại " + datetime.now().strftime("%d/%m/%Y %H:%M")
            conversation_id = storage_service.create_conversation(current_user, title=conversation_title)
        
        # Lưu tin nhắn người dùng vào hội thoại
        storage_service.add_message_to_conversation(conversation_id, "user", user_message)
        
        def generate():
            full_response = ""
            
            # Stream phản hồi từ mô hình
            for text_chunk in chatbot_service.generate_response_stream(user_message, conversation_history):
                full_response += text_chunk
                yield f"data: {json.dumps({'chunk': text_chunk, 'done': False})}\n\n"
            
            # Lưu phản hồi đầy đủ vào lịch sử
            storage_service.add_message_to_conversation(conversation_id, "assistant", full_response)
            
            # Gửi thông báo conversation_id và hoàn thành
            yield f"data: {json.dumps({'chunk': '', 'done': True, 'conversation_id': conversation_id})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Lỗi chat stream: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/chat/public', methods=['POST'])
@api_key_required
def chat_public(**kwargs):
    """API chat công khai, yêu cầu API key"""
    try:
        data = request.json
        user_message = data.get("message")
        session_id = data.get("session_id", "public")
        user_id = data.get("user_id")  # ID của người dùng từ ứng dụng tích hợp
        user_info = data.get("user_info")  # Thông tin bổ sung về người dùng
        
        # Lấy API key từ kwargs (được thêm trong decorator)
        api_key = kwargs.get('api_key')
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Theo dõi người dùng API nếu có user_id
        if user_id:
            storage_service.track_api_user(api_key, user_id, user_info)
        
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

@api_bp.route('/chat/public/stream', methods=['POST'])
@api_key_required
def chat_public_stream(**kwargs):
    """API chat công khai với phản hồi stream, yêu cầu API key"""
    try:
        data = request.json
        user_message = data.get("message")
        session_id = data.get("session_id", "public")
        user_id = data.get("user_id")  # ID của người dùng từ ứng dụng tích hợp
        user_info = data.get("user_info")  # Thông tin bổ sung về người dùng
        
        # Lấy API key từ kwargs (được thêm trong decorator)
        api_key = kwargs.get('api_key')
        
        if not user_message:
            return jsonify({"error": "Tin nhắn không được để trống"}), 400
        
        # Theo dõi người dùng API nếu có user_id
        if user_id:
            storage_service.track_api_user(api_key, user_id, user_info)
        
        # Lấy lịch sử hội thoại (nếu có)
        conversation_history = data.get("conversation_history", [])
        
        def generate():
            # Stream phản hồi từ mô hình
            for text_chunk in chatbot_service.generate_response_stream(user_message, conversation_history):
                yield f"data: {json.dumps({'chunk': text_chunk, 'done': False})}\n\n"
            
            # Gửi thông báo hoàn thành
            yield f"data: {json.dumps({'chunk': '', 'done': True})}\n\n"
        
        return Response(generate(), mimetype='text/event-stream')
        
    except Exception as e:
        logger.error(f"Lỗi chat public stream: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

# --- API endpoints cho quản lý người dùng và health check ---

@api_bp.route('/health', methods=['GET'])
def health_check():
    """API kiểm tra trạng thái hoạt động của hệ thống"""
    return jsonify({
        "status": "online",
        "service": "Code Supporter API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "storage_type": storage_service.storage_type
    })

@api_bp.route('/register', methods=['POST'])
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

@api_bp.route('/login', methods=['POST'])
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
            # Lấy thông tin người dùng (không có mật khẩu)
            user_info = storage_service.get_user_info(username)
            
            # Tạo token JWT
            token = jwt.encode({
                'username': username,
                'exp': datetime.utcnow() + timedelta(days=1)
            }, SECRET_KEY, algorithm="HS256")
            
            return jsonify({
                "message": "Đăng nhập thành công",
                "token": token,
                "username": username,
                "user_info": user_info
            }), 200
        else:
            return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401
            
    except Exception as e:
        logger.error(f"Lỗi đăng nhập: {str(e)}")
        return jsonify({"error": f"Lỗi server: {str(e)}"}), 500

@api_bp.route('/user/info', methods=['GET'])
@token_required
def get_user_info(current_user):
    """API lấy thông tin người dùng hiện tại"""
    try:
        # Lấy thông tin người dùng (không có mật khẩu)
        user_info = storage_service.get_user_info(current_user)
        
        if user_info:
            return jsonify({
                "user_info": user_info,
                "status": "success"
            })
        else:
            return jsonify({
                "error": "Không tìm thấy thông tin người dùng",
                "status": "error"
            }), 404
        
    except Exception as e:
        logger.error(f"Lỗi lấy thông tin người dùng: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/user/settings', methods=['POST'])
@token_required
def update_user_settings(current_user):
    """API cập nhật cài đặt người dùng"""
    try:
        data = request.json
        settings = data.get("settings")
        
        if not settings or not isinstance(settings, dict):
            return jsonify({"error": "Cài đặt không hợp lệ"}), 400
        
        success = storage_service.update_user_settings(current_user, settings)
        if success:
            return jsonify({
                "message": "Đã cập nhật cài đặt thành công",
                "status": "success"
            })
        else:
            return jsonify({
                "error": "Không thể cập nhật cài đặt",
                "status": "error"
            }), 500
        
    except Exception as e:
        logger.error(f"Lỗi cập nhật cài đặt người dùng: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/user/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """API thay đổi mật khẩu người dùng"""
    try:
        data = request.json
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not current_password or not new_password:
            return jsonify({"error": "Thiếu mật khẩu hiện tại hoặc mật khẩu mới"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "Mật khẩu mới phải có ít nhất 6 ký tự"}), 400
        
        success = storage_service.change_password(current_user, current_password, new_password)
        if success:
            return jsonify({
                "message": "Đã thay đổi mật khẩu thành công",
                "status": "success"
            })
        else:
            return jsonify({
                "error": "Không thể thay đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại.",
                "status": "error"
            }), 400
        
    except Exception as e:
        logger.error(f"Lỗi thay đổi mật khẩu: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

# --- API endpoints cho quản lý API keys ---

@api_bp.route('/apikey/create', methods=['POST'])
@token_required
def create_api_key(current_user):
    """API tạo API key mới"""
    try:
        data = request.json
        name = data.get("name", f"API key for {current_user}")
        permissions = data.get("permissions", ["chat"])
        
        # Tạo API key mới với thêm thông tin người tạo
        api_key, api_secret = storage_service.create_api_key(name, permissions, current_user)
        
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

@api_bp.route('/apikey/list', methods=['GET'])
@token_required
def list_api_keys(current_user):
    """API lấy danh sách API key của người dùng"""
    try:
        # Lấy danh sách API key đã tạo bởi người dùng hiện tại
        api_keys = storage_service.get_api_keys(created_by=current_user)
        
        return jsonify({
            "api_keys": api_keys,
            "count": len(api_keys)
        })
        
    except Exception as e:
        logger.error(f"Lỗi lấy danh sách API key: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/apikey/analytics', methods=['GET'])
@token_required
def api_key_analytics(current_user):
    """API lấy thông tin phân tích về việc sử dụng API key"""
    try:
        api_key = request.args.get('api_key')
        time_period = request.args.get('period', 'all')  # all, day, week, month
        
        # Kiểm tra quyền truy cập
        if api_key:
            api_keys = storage_service.get_api_keys(created_by=current_user)
            if not any(key["key"] == api_key for key in api_keys):
                return jsonify({"error": "Bạn không có quyền truy cập API key này"}), 403
        
        # Lấy thống kê sử dụng API
        stats = storage_service.get_api_usage_stats(api_key=api_key, time_period=time_period)
        
        # Lấy danh sách người dùng theo API key
        users = []
        if api_key:
            # Xác định thời gian dựa vào period
            since = None
            if time_period == "day":
                since = datetime.now() - timedelta(days=1)
            elif time_period == "week":
                since = datetime.now() - timedelta(days=7)
            elif time_period == "month":
                since = datetime.now() - timedelta(days=30)
                
            users = storage_service.get_api_users(api_key=api_key, limit=100, since=since)
        
        return jsonify({
            "total_users": stats.get("total_users", 0),
            "total_requests": stats.get("total_requests", 0),
            "active_users_24h": stats.get("active_users_24h", 0),
            "active_users_7d": stats.get("active_users_7d", 0),
            "api_keys_stats": stats.get("api_keys", []),
            "users": users[:100]  # Giới hạn 100 người dùng gần đây nhất
        })
        
    except Exception as e:
        logger.error(f"Lỗi lấy phân tích API key: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/apikey/update', methods=['POST'])
@token_required
def update_api_key(current_user):
    """API cập nhật trạng thái hoặc quyền hạn của API key"""
    try:
        data = request.json
        api_key = data.get("api_key")
        action = data.get("action")  # 'status' or 'permissions'
        
        if not api_key or not action:
            return jsonify({"error": "Thiếu thông tin cập nhật"}), 400
        
        # Kiểm tra quyền truy cập
        api_keys = storage_service.get_api_keys(created_by=current_user)
        if not any(key["key"] == api_key for key in api_keys):
            return jsonify({"error": "Bạn không có quyền cập nhật API key này"}), 403
        
        if action == "status":
            status = data.get("status")
            if status not in ["active", "disabled"]:
                return jsonify({"error": "Trạng thái không hợp lệ"}), 400
                
            success = storage_service.update_api_key_status(api_key, status, current_user)
            if success:
                return jsonify({"message": f"Đã cập nhật trạng thái thành {status}"})
            else:
                return jsonify({"error": "Không thể cập nhật trạng thái"}), 500
                
        elif action == "permissions":
            permissions = data.get("permissions")
            if not permissions or not isinstance(permissions, list):
                return jsonify({"error": "Quyền hạn không hợp lệ"}), 400
                
            success = storage_service.update_api_key_permissions(api_key, permissions, current_user)
            if success:
                return jsonify({"message": "Đã cập nhật quyền hạn"})
            else:
                return jsonify({"error": "Không thể cập nhật quyền hạn"}), 500
        else:
            return jsonify({"error": "Hành động không hợp lệ"}), 400
        
    except Exception as e:
        logger.error(f"Lỗi cập nhật API key: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/apikey/delete', methods=['POST'])
@token_required
def delete_api_key(current_user):
    """API xóa API key"""
    try:
        data = request.json
        api_key = data.get("api_key")
        
        if not api_key:
            return jsonify({"error": "Thiếu thông tin API key"}), 400
        
        # Kiểm tra quyền truy cập
        api_keys = storage_service.get_api_keys(created_by=current_user)
        if not any(key["key"] == api_key for key in api_keys):
            return jsonify({"error": "Bạn không có quyền xóa API key này"}), 403
        
        success = storage_service.delete_api_key(api_key, current_user)
        if success:
            return jsonify({"message": "Đã xóa API key thành công"})
        else:
            return jsonify({"error": "Không thể xóa API key"}), 500
        
    except Exception as e:
        logger.error(f"Lỗi xóa API key: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

@api_bp.route('/user/clear-history', methods=['POST'])
@token_required
def clear_history(current_user):
    """API xóa lịch sử hội thoại của người dùng"""
    try:
        success = storage_service.delete_all_conversations(current_user)
        if success:
            return jsonify({
                "message": "Đã xóa lịch sử hội thoại thành công",
                "status": "success"
            })
        else:
            return jsonify({
                "error": "Không thể xóa lịch sử hội thoại",
                "status": "error"
            }), 500
        
    except Exception as e:
        logger.error(f"Lỗi xóa lịch sử hội thoại: {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500