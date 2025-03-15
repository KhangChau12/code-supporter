"""
Module quản lý lưu trữ dữ liệu cho Code Supporter
Cập nhật: Tối ưu hóa cho MongoDB, thêm tracking API users
"""
import os
from dotenv import load_dotenv
import logging
import json
import pymongo
from datetime import datetime, timedelta
import hashlib
import uuid
import re
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from bson.objectid import ObjectId
from typing import Dict, List, Tuple, Optional, Any, Union
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

class StorageService:
    def __init__(self, db_uri=None):
        """Khởi tạo dịch vụ lưu trữ"""
        try:
            self.db_uri = db_uri or os.getenv("MONGODB_URI")
            
            if not self.db_uri:
                # Nếu không có URI MongoDB, sử dụng lưu trữ file
                logger.warning("Không tìm thấy URI MongoDB, sử dụng lưu trữ file")
                self.storage_type = "file"
                self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
                os.makedirs(self.data_dir, exist_ok=True)
                # Tạo các thư mục con nếu cần
                for subdir in ["users", "conversations", "api_keys", "api_users"]:
                    os.makedirs(os.path.join(self.data_dir, subdir), exist_ok=True)
            else:
                # Kết nối MongoDB với các tùy chọn mới nhất
                self.storage_type = "mongodb"
                
                # Cấu hình kết nối MongoDB Atlas
                self.client = MongoClient(
                    self.db_uri,
                    server_api=ServerApi('1'),  # Sử dụng Stable API version 1
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=5000,
                    retryWrites=True,
                    w="majority"
                )
                
                # Kiểm tra kết nối bằng ping
                self.client.admin.command('ping')
                
                self.db = self.client.codesupporter
                
                # Tạo indexes cho các collection
                self._setup_mongodb_indexes()
                
                logger.info("Kết nối MongoDB Atlas thành công")
                
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Không thể kết nối đến MongoDB: {str(e)}")
            # Fallback sang lưu trữ file nếu kết nối MongoDB thất bại
            self.storage_type = "file"
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(self.data_dir, exist_ok=True)
            # Tạo các thư mục con nếu cần
            for subdir in ["users", "conversations", "api_keys", "api_users"]:
                os.makedirs(os.path.join(self.data_dir, subdir), exist_ok=True)
            logger.warning("Chuyển sang sử dụng lưu trữ file")
        except Exception as e:
            logger.error(f"Lỗi không xác định khi khởi tạo lưu trữ: {str(e)}")
            # Fallback sang lưu trữ file nếu có bất kỳ lỗi nào khác
            self.storage_type = "file"
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(self.data_dir, exist_ok=True)
            # Tạo các thư mục con nếu cần
            for subdir in ["users", "conversations", "api_keys", "api_users"]:
                os.makedirs(os.path.join(self.data_dir, subdir), exist_ok=True)
            logger.warning("Chuyển sang sử dụng lưu trữ file do lỗi không xác định")
    
    
    def _hash_password(self, password: str) -> str:
        """Hash mật khẩu sử dụng SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _sanitize_mongodb_doc(self, doc: Dict) -> Dict:
        """Chuyển đổi ObjectId thành string để serialization"""
        if not doc:
            return doc
            
        result = {}
        for key, value in doc.items():
            if key == '_id' and isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = self._sanitize_mongodb_doc(value)
            elif isinstance(value, list):
                result[key] = [self._sanitize_mongodb_doc(item) if isinstance(item, dict) else item for item in value]
            else:
                result[key] = value
                
        return result
    
    def _sanitize_filename(self, filename: str) -> str:
        """Đảm bảo filename an toàn, không chứa ký tự đặc biệt"""
        return re.sub(r'[^\w\-_\.]', '_', filename)
    
    def _setup_mongodb_indexes(self):
        """Thiết lập các indexes cho hiệu suất tốt hơn"""
        if self.storage_type != "mongodb":
            return
            
        try:
            # Tạo indexes cho từng collection một cách riêng biệt để tránh lỗi
            
            # Index cho users collection
            try:
                self.db.users.create_index("username", unique=True)
                logger.info("Đã tạo index cho users collection")
            except Exception as e:
                logger.error(f"Lỗi khi tạo index cho users collection: {str(e)}")
            
            # Index cho conversations collection
            try:
                self.db.conversations.create_index([("username", 1), ("timestamp", -1)])
                logger.info("Đã tạo index cho conversations collection")
            except Exception as e:
                logger.error(f"Lỗi khi tạo index cho conversations collection: {str(e)}")
            
            # Index cho api_keys collection
            try:
                self.db.api_keys.create_index("key", unique=True)
                self.db.api_keys.create_index("created_by")
                logger.info("Đã tạo index cho api_keys collection")
            except Exception as e:
                logger.error(f"Lỗi khi tạo index cho api_keys collection: {str(e)}")
            
            # Index cho api_users collection
            try:
                self.db.api_users.create_index([("api_key", 1), ("user_id", 1)])
                self.db.api_users.create_index("last_active", -1)
                logger.info("Đã tạo index cho api_users collection")
            except Exception as e:
                logger.error(f"Lỗi khi tạo index cho api_users collection: {str(e)}")
            
            logger.info("Quá trình thiết lập MongoDB indexes đã hoàn tất")
        except Exception as e:
            logger.error(f"Lỗi khi thiết lập MongoDB indexes: {str(e)}")
    
    def authenticate_user(self, username: str, password: str) -> bool:
        """Xác thực người dùng"""
        try:
            hashed_password = self._hash_password(password)
            
            if self.storage_type == "mongodb":
                user = self.db.users.find_one({
                    "username": username,
                    "password": hashed_password
                })
                
                if user:
                    # Cập nhật thời gian đăng nhập
                    self.db.users.update_one(
                        {"_id": user["_id"]},
                        {"$set": {"last_login": datetime.now()}}
                    )
                    return True
                
                return False
                
            else:
                # Lưu trữ file
                users_file = os.path.join(self.data_dir, "users", "users.json")
                
                if not os.path.exists(users_file):
                    return False
                
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
                
                for i, user in enumerate(users):
                    if user["username"] == username and user["password"] == hashed_password:
                        # Cập nhật thời gian đăng nhập
                        users[i]["last_login"] = datetime.now().isoformat()
                        
                        with open(users_file, "w", encoding="utf-8") as f:
                            json.dump(users, f, ensure_ascii=False, indent=2)
                        
                        return True
                
                return False
                
        except Exception as e:
            logger.error(f"Lỗi khi xác thực người dùng: {str(e)}")
            return False
    
    def update_user_settings(self, username: str, settings: Dict) -> bool:
        """Cập nhật cài đặt người dùng"""
        try:
            if self.storage_type == "mongodb":
                result = self.db.users.update_one(
                    {"username": username},
                    {"$set": {"settings": settings}}
                )
                return result.modified_count > 0
            else:
                # Lưu trữ file
                users_file = os.path.join(self.data_dir, "users", "users.json")
                
                if not os.path.exists(users_file):
                    return False
                
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
                
                for i, user in enumerate(users):
                    if user["username"] == username:
                        users[i]["settings"] = settings
                        
                        with open(users_file, "w", encoding="utf-8") as f:
                            json.dump(users, f, ensure_ascii=False, indent=2)
                        
                        return True
                
                return False
        except Exception as e:
            logger.error(f"Lỗi khi cập nhật cài đặt người dùng: {str(e)}")
            return False
    
    def get_user_info(self, username: str) -> Optional[Dict]:
        """Lấy thông tin người dùng (ngoại trừ mật khẩu)"""
        try:
            if self.storage_type == "mongodb":
                user = self.db.users.find_one({"username": username}, {"password": 0})
                if user:
                    # Convert MongoDB _id to string for serialization
                    return self._sanitize_mongodb_doc(user)
                return None
            else:
                # Lưu trữ file
                users_file = os.path.join(self.data_dir, "users", "users.json")
                
                if not os.path.exists(users_file):
                    return None
                
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
                
                for user in users:
                    if user["username"] == username:
                        # Không trả về mật khẩu
                        user_info = {k: v for k, v in user.items() if k != "password"}
                        return user_info
                
                return None
        except Exception as e:
            logger.error(f"Lỗi khi lấy thông tin người dùng: {str(e)}")
            return None
    
    def change_password(self, username: str, current_password: str, new_password: str) -> bool:
        """Thay đổi mật khẩu của người dùng"""
        try:
            # Xác thực mật khẩu hiện tại
            if not self.authenticate_user(username, current_password):
                return False
                
            hashed_new_password = self._hash_password(new_password)
            
            if self.storage_type == "mongodb":
                result = self.db.users.update_one(
                    {"username": username},
                    {"$set": {"password": hashed_new_password}}
                )
                return result.modified_count > 0
            else:
                # Lưu trữ file
                users_file = os.path.join(self.data_dir, "users", "users.json")
                
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
                
                for i, user in enumerate(users):
                    if user["username"] == username:
                        users[i]["password"] = hashed_new_password
                        
                        with open(users_file, "w", encoding="utf-8") as f:
                            json.dump(users, f, ensure_ascii=False, indent=2)
                        
                        return True
                        
                return False
        except Exception as e:
            logger.error(f"Lỗi khi thay đổi mật khẩu: {str(e)}")
            return False
    
    def save_conversation(self, username: str, role: str, content: str) -> bool:
        """Lưu tin nhắn vào lịch sử hội thoại"""
        try:
            timestamp = datetime.now()
            
            conversation_data = {
                "username": username,
                "role": role,
                "content": content,
                "timestamp": timestamp
            }
            
            if self.storage_type == "mongodb":
                self.db.conversations.insert_one(conversation_data)
            else:
                # Lưu trữ file
                # Sử dụng mô hình lưu trữ phân tách theo người dùng
                conversation_dir = os.path.join(self.data_dir, "conversations", username)
                os.makedirs(conversation_dir, exist_ok=True)
                
                # Lưu theo tháng để tránh file quá lớn
                month_key = timestamp.strftime("%Y-%m")
                conversations_file = os.path.join(conversation_dir, f"{month_key}.json")
                
                if os.path.exists(conversations_file):
                    with open(conversations_file, "r", encoding="utf-8") as f:
                        conversations = json.load(f)
                else:
                    conversations = []
                
                conversation_data["timestamp"] = timestamp.isoformat()
                conversations.append(conversation_data)
                
                with open(conversations_file, "w", encoding="utf-8") as f:
                    json.dump(conversations, f, ensure_ascii=False, indent=2)
                    
            logger.info(f"Lưu tin nhắn thành công cho {username}")
            return True
            
        except Exception as e:
            logger.error(f"Lỗi khi lưu tin nhắn: {str(e)}")
            return False
    
    def get_conversation_history(self, username: str, limit: int = 10) -> List[Dict[str, str]]:
        """Lấy lịch sử hội thoại của người dùng"""
        try:
            if self.storage_type == "mongodb":
                conversations = list(self.db.conversations.find(
                    {"username": username}
                ).sort("timestamp", -1).limit(limit))
                
                # Đảo ngược để có thứ tự đúng (cũ đến mới)
                conversations.reverse()
                
                return [{
                    "role": conv["role"],
                    "content": conv["content"]
                } for conv in conversations]
                
            else:
                # Lưu trữ file - cải tiến để đọc từ nhiều file theo tháng
                conversation_dir = os.path.join(self.data_dir, "conversations", username)
                
                if not os.path.exists(conversation_dir):
                    return []
                
                # Lấy danh sách các file hội thoại theo tháng
                conversation_files = sorted([
                    f for f in os.listdir(conversation_dir) 
                    if f.endswith('.json')
                ], reverse=True)
                
                all_conversations = []
                
                # Đọc từ các file gần đây nhất cho đến khi đủ limit
                for file_name in conversation_files:
                    file_path = os.path.join(conversation_dir, file_name)
                    
                    with open(file_path, "r", encoding="utf-8") as f:
                        month_conversations = json.load(f)
                    
                    # Sắp xếp theo thời gian
                    month_conversations.sort(key=lambda x: x["timestamp"])
                    all_conversations.extend(month_conversations)
                    
                    if len(all_conversations) >= limit:
                        break
                
                # Lấy limit tin nhắn gần nhất
                recent_conversations = all_conversations[-limit:] if len(all_conversations) > limit else all_conversations
                
                return [{
                    "role": conv["role"],
                    "content": conv["content"]
                } for conv in recent_conversations]
                
        except Exception as e:
            logger.error(f"Lỗi khi lấy lịch sử hội thoại: {str(e)}")
            return []
    
    def delete_conversations(self, username: str) -> bool:
        """Xóa tất cả lịch sử hội thoại của người dùng"""
        try:
            if self.storage_type == "mongodb":
                result = self.db.conversations.delete_many({"username": username})
                deleted_count = result.deleted_count
                logger.info(f"Đã xóa {deleted_count} tin nhắn của {username}")
                return True
            else:
                # Lưu trữ file
                conversation_dir = os.path.join(self.data_dir, "conversations", username)
                
                if not os.path.exists(conversation_dir):
                    return True
                
                # Lấy danh sách file hội thoại
                conversation_files = [
                    f for f in os.listdir(conversation_dir) 
                    if f.endswith('.json')
                ]
                
                # Xóa từng file
                for file_name in conversation_files:
                    file_path = os.path.join(conversation_dir, file_name)
                    os.remove(file_path)
                
                # Xóa thư mục nếu trống
                if len(os.listdir(conversation_dir)) == 0:
                    os.rmdir(conversation_dir)
                
                logger.info(f"Đã xóa tất cả lịch sử hội thoại của {username}")
                return True
                
        except Exception as e:
            logger.error(f"Lỗi khi xóa lịch sử hội thoại: {str(e)}")
            return False
    
    def create_api_key(self, name: str, permissions: List[str] = None, created_by: str = None) -> Tuple[Optional[str], Optional[str]]:
        """Tạo API key mới cho tích hợp"""
        try:
            api_key = str(uuid.uuid4())
            api_secret = str(uuid.uuid4())
            
            api_data = {
                "key": api_key,
                "secret": self._hash_password(api_secret),
                "name": name,
                "permissions": permissions or ["chat"],
                "created_at": datetime.now(),
                "created_by": created_by,  # Thêm người tạo
                "last_used": None,
                "status": "active"  # Trạng thái của API key (active/disabled)
            }
            
            if self.storage_type == "mongodb":
                self.db.api_keys.insert_one(api_data)
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if os.path.exists(api_keys_file):
                    with open(api_keys_file, "r", encoding="utf-8") as f:
                        api_keys = json.load(f)
                else:
                    api_keys = []
                
                api_data["created_at"] = api_data["created_at"].isoformat()
                api_keys.append(api_data)
                
                with open(api_keys_file, "w", encoding="utf-8") as f:
                    json.dump(api_keys, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Tạo API key thành công: {name}")
            return api_key, api_secret
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo API key: {str(e)}")
            return None, None
    
    def verify_api_key(self, api_key: str) -> Tuple[bool, List[str]]:
        """Xác thực API key"""
        try:
            if self.storage_type == "mongodb":
                key_data = self.db.api_keys.find_one({"key": api_key, "status": "active"})
                
                if key_data:
                    # Cập nhật thời gian sử dụng
                    self.db.api_keys.update_one(
                        {"_id": key_data["_id"]},
                        {"$set": {"last_used": datetime.now()}}
                    )
                    return True, key_data["permissions"]
                
                return False, []
                
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return False, []
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                for i, key_data in enumerate(api_keys):
                    if key_data["key"] == api_key and key_data.get("status", "active") == "active":
                        # Cập nhật thời gian sử dụng
                        api_keys[i]["last_used"] = datetime.now().isoformat()
                        
                        with open(api_keys_file, "w", encoding="utf-8") as f:
                            json.dump(api_keys, f, ensure_ascii=False, indent=2)
                        
                        return True, key_data["permissions"]
                
                return False, []
                
        except Exception as e:
            logger.error(f"Lỗi khi xác thực API key: {str(e)}")
            return False, []
    
    def update_api_key_status(self, api_key: str, status: str, updated_by: str = None) -> bool:
        """Cập nhật trạng thái API key (active/disabled)"""
        try:
            if status not in ["active", "disabled"]:
                return False
                
            if self.storage_type == "mongodb":
                result = self.db.api_keys.update_one(
                    {"key": api_key},
                    {
                        "$set": {
                            "status": status,
                            "updated_at": datetime.now(),
                            "updated_by": updated_by
                        }
                    }
                )
                return result.modified_count > 0
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return False
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                for i, key_data in enumerate(api_keys):
                    if key_data["key"] == api_key:
                        api_keys[i]["status"] = status
                        api_keys[i]["updated_at"] = datetime.now().isoformat()
                        api_keys[i]["updated_by"] = updated_by
                        
                        with open(api_keys_file, "w", encoding="utf-8") as f:
                            json.dump(api_keys, f, ensure_ascii=False, indent=2)
                        
                        return True
                
                return False
        except Exception as e:
            logger.error(f"Lỗi khi cập nhật trạng thái API key: {str(e)}")
            return False
    
    def get_api_keys(self, created_by: str = None) -> List[Dict]:
        """Lấy danh sách API keys"""
        try:
            if self.storage_type == "mongodb":
                query = {}
                if created_by:
                    query["created_by"] = created_by
                
                keys = list(self.db.api_keys.find(query, {"secret": 0}))
                # Convert MongoDB _id to string for serialization
                return [self._sanitize_mongodb_doc(key) for key in keys]
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return []
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                if created_by:
                    api_keys = [key for key in api_keys if key.get("created_by") == created_by]
                
                # Không trả về secret
                return [{k: v for k, v in key.items() if k != "secret"} for key in api_keys]
                
        except Exception as e:
            logger.error(f"Lỗi khi lấy danh sách API keys: {str(e)}")
            return []
    
    def delete_api_key(self, api_key: str, deleted_by: str = None) -> bool:
        """Xóa API key"""
        try:
            if self.storage_type == "mongodb":
                # Có thể lưu lịch sử xóa thay vì xóa hoàn toàn
                result = self.db.api_keys.update_one(
                    {"key": api_key},
                    {
                        "$set": {
                            "status": "deleted",
                            "deleted_at": datetime.now(),
                            "deleted_by": deleted_by
                        }
                    }
                )
                return result.modified_count > 0
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return False
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                for i, key_data in enumerate(api_keys):
                    if key_data["key"] == api_key:
                        # Cập nhật trạng thái thay vì xóa
                        api_keys[i]["status"] = "deleted"
                        api_keys[i]["deleted_at"] = datetime.now().isoformat()
                        api_keys[i]["deleted_by"] = deleted_by
                        
                        with open(api_keys_file, "w", encoding="utf-8") as f:
                            json.dump(api_keys, f, ensure_ascii=False, indent=2)
                        
                        return True
                
                return False
        except Exception as e:
            logger.error(f"Lỗi khi xóa API key: {str(e)}")
            return False
    
    def update_api_key_permissions(self, api_key: str, permissions: List[str], updated_by: str = None) -> bool:
        """Cập nhật quyền hạn của API key"""
        try:
            if self.storage_type == "mongodb":
                result = self.db.api_keys.update_one(
                    {"key": api_key},
                    {
                        "$set": {
                            "permissions": permissions,
                            "updated_at": datetime.now(),
                            "updated_by": updated_by
                        }
                    }
                )
                return result.modified_count > 0
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys", "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return False
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                for i, key_data in enumerate(api_keys):
                    if key_data["key"] == api_key:
                        api_keys[i]["permissions"] = permissions
                        api_keys[i]["updated_at"] = datetime.now().isoformat()
                        api_keys[i]["updated_by"] = updated_by
                        
                        with open(api_keys_file, "w", encoding="utf-8") as f:
                            json.dump(api_keys, f, ensure_ascii=False, indent=2)
                        
                        return True
                
                return False
        except Exception as e:
            logger.error(f"Lỗi khi cập nhật quyền hạn API key: {str(e)}")
            return False
    
    def track_api_user(self, api_key: str, user_id: str, user_info: Dict = None) -> bool:
        """
        Theo dõi người dùng qua API
        
        Args:
            api_key (str): API key được sử dụng
            user_id (str): ID của người dùng từ ứng dụng tích hợp
            user_info (dict, optional): Thông tin bổ sung về người dùng
        """
        try:
            timestamp = datetime.now()
            
            # Đảm bảo user_id là chuỗi an toàn để dùng làm filename
            safe_user_id = self._sanitize_filename(user_id)
            
            if self.storage_type == "mongodb":
                # Kiểm tra xem đã có bản ghi chưa
                existing_user = self.db.api_users.find_one({
                    "api_key": api_key, 
                    "user_id": user_id
                })
                
                if existing_user:
                    # Cập nhật bản ghi hiện có
                    update_data = {
                        "$set": {
                            "last_active": timestamp,
                            "user_info": user_info or existing_user.get("user_info")
                        },
                        "$inc": {"total_requests": 1}
                    }
                    
                    self.db.api_users.update_one(
                        {"_id": existing_user["_id"]},
                        update_data
                    )
                else:
                    # Tạo bản ghi mới
                    api_user_data = {
                        "api_key": api_key,
                        "user_id": user_id,
                        "first_seen": timestamp,
                        "last_active": timestamp,
                        "total_requests": 1
                    }
                    
                    # Thêm thông tin bổ sung nếu có
                    if user_info:
                        api_user_data["user_info"] = user_info
                        
                    self.db.api_users.insert_one(api_user_data)
            else:
                # Lưu trữ file
                api_users_dir = os.path.join(self.data_dir, "api_users")
                os.makedirs(api_users_dir, exist_ok=True)
                
                # Sử dụng API key làm thư mục để phân tách dữ liệu
                api_key_dir = os.path.join(api_users_dir, self._sanitize_filename(api_key))
                os.makedirs(api_key_dir, exist_ok=True)
                
                # File cho từng user (để tránh file quá lớn)
                user_file = os.path.join(api_key_dir, f"{safe_user_id}.json")
                
                api_user_data = None
                
                if os.path.exists(user_file):
                    # Cập nhật dữ liệu hiện có
                    with open(user_file, "r", encoding="utf-8") as f:
                        api_user_data = json.load(f)
                    
                    api_user_data["last_active"] = timestamp.isoformat()
                    api_user_data["total_requests"] += 1
                    
                    # Cập nhật thông tin nếu có
                    if user_info:
                        api_user_data["user_info"] = user_info
                else:
                    # Tạo dữ liệu mới
                    api_user_data = {
                        "api_key": api_key,
                        "user_id": user_id,
                        "first_seen": timestamp.isoformat(),
                        "last_active": timestamp.isoformat(),
                        "total_requests": 1
                    }
                    
                    # Thêm thông tin bổ sung nếu có
                    if user_info:
                        api_user_data["user_info"] = user_info
                
                # Lưu dữ liệu
                with open(user_file, "w", encoding="utf-8") as f:
                    json.dump(api_user_data, f, ensure_ascii=False, indent=2)
                
                # Cập nhật danh sách tổng hợp nếu cần
                summary_file = os.path.join(api_key_dir, "_summary.json")
                
                summary_data = {
                    "total_users": 0,
                    "total_requests": 0,
                    "last_updated": timestamp.isoformat()
                }
                
                if os.path.exists(summary_file):
                    with open(summary_file, "r", encoding="utf-8") as f:
                        summary_data = json.load(f)
                
                # Cập nhật tổng số request
                summary_data["total_requests"] += 1
                summary_data["last_updated"] = timestamp.isoformat()
                
                # Lưu tổng hợp
                with open(summary_file, "w", encoding="utf-8") as f:
                    json.dump(summary_data, f, ensure_ascii=False, indent=2)
                    
            return True
            
        except Exception as e:
            logger.error(f"Lỗi khi theo dõi người dùng API: {str(e)}")
            return False
    
    def get_api_users(self, api_key: str = None, limit: int = 100, since: datetime = None) -> List[Dict]:
        """Lấy danh sách người dùng qua API"""
        try:
            # Nếu không có since, mặc định 30 ngày
            if not since:
                since = datetime.now() - timedelta(days=30)
                
            if self.storage_type == "mongodb":
                query = {}
                if api_key:
                    query["api_key"] = api_key
                    
                # Chỉ lấy người dùng hoạt động gần đây
                query["last_active"] = {"$gte": since}
                
                users = list(self.db.api_users.find(query).sort("last_active", -1).limit(limit))
                
                # Convert MongoDB _id to string for serialization
                return [self._sanitize_mongodb_doc(user) for user in users]
            else:
                # Lưu trữ file
                api_users_dir = os.path.join(self.data_dir, "api_users")
                
                if not os.path.exists(api_users_dir):
                    return []
                
                all_users = []
                
                # Nếu có api_key cụ thể
                if api_key:
                    api_key_dir = os.path.join(api_users_dir, self._sanitize_filename(api_key))
                    
                    if not os.path.exists(api_key_dir):
                        return []
                    
                    # Lấy tất cả file user (trừ _summary.json)
                    user_files = [
                        f for f in os.listdir(api_key_dir)
                        if f.endswith('.json') and f != "_summary.json"
                    ]
                    
                    for file_name in user_files:
                        file_path = os.path.join(api_key_dir, file_name)
                        
                        with open(file_path, "r", encoding="utf-8") as f:
                            user_data = json.load(f)
                        
                        # Kiểm tra thời gian hoạt động
                        last_active = datetime.fromisoformat(user_data["last_active"])
                        if last_active >= since:
                            all_users.append(user_data)
                else:
                    # Lấy tất cả API key
                    api_key_dirs = [
                        d for d in os.listdir(api_users_dir)
                        if os.path.isdir(os.path.join(api_users_dir, d))
                    ]
                    
                    for api_key_dir_name in api_key_dirs:
                        api_key_dir_path = os.path.join(api_users_dir, api_key_dir_name)
                        
                        # Lấy tất cả file user
                        user_files = [
                            f for f in os.listdir(api_key_dir_path)
                            if f.endswith('.json') and f != "_summary.json"
                        ]
                        
                        for file_name in user_files:
                            file_path = os.path.join(api_key_dir_path, file_name)
                            
                            with open(file_path, "r", encoding="utf-8") as f:
                                user_data = json.load(f)
                            
                            # Kiểm tra thời gian hoạt động
                            last_active = datetime.fromisoformat(user_data["last_active"])
                            if last_active >= since:
                                all_users.append(user_data)
                
                # Sắp xếp theo thời gian hoạt động gần nhất
                all_users.sort(key=lambda x: x["last_active"], reverse=True)
                
                # Giới hạn số lượng
                return all_users[:limit]
                
        except Exception as e:
            logger.error(f"Lỗi khi lấy danh sách người dùng API: {str(e)}")
            return []
    
    def get_api_usage_stats(self, api_key: str = None, time_period: str = "all") -> Dict:
        """
        Lấy thống kê sử dụng API
        
        Args:
            api_key (str, optional): API key cụ thể hoặc tất cả
            time_period (str): "day", "week", "month", "all"
            
        Returns:
            dict: Thống kê sử dụng
        """
        try:
            # Xác định thời gian bắt đầu dựa trên time_period
            now = datetime.now()
            
            if time_period == "day":
                since = now - timedelta(days=1)
            elif time_period == "week":
                since = now - timedelta(days=7)
            elif time_period == "month":
                since = now - timedelta(days=30)
            else:  # "all"
                since = datetime(2000, 1, 1)  # Ngày xa trong quá khứ
            
            if self.storage_type == "mongodb":
                # Chuẩn bị query
                match_query = {"last_active": {"$gte": since}}
                if api_key:
                    match_query["api_key"] = api_key
                
                # Tổng hợp dữ liệu
                pipeline = [
                    {"$match": match_query},
                    {"$group": {
                        "_id": "$api_key",
                        "total_users": {"$sum": 1},
                        "total_requests": {"$sum": "$total_requests"},
                        "last_request": {"$max": "$last_active"}
                    }},
                    {"$sort": {"last_request": -1}}
                ]
                
                results = list(self.db.api_users.aggregate(pipeline))
                
                # Xác định số người dùng hoạt động trong 24h và 7 ngày
                active_24h = 0
                active_7d = 0
                
                # Query cho người dùng hoạt động trong 24h
                query_24h = {"last_active": {"$gte": now - timedelta(hours=24)}}
                if api_key:
                    query_24h["api_key"] = api_key
                active_24h = self.db.api_users.count_documents(query_24h)
                
                # Query cho người dùng hoạt động trong 7 ngày
                query_7d = {"last_active": {"$gte": now - timedelta(days=7)}}
                if api_key:
                    query_7d["api_key"] = api_key
                active_7d = self.db.api_users.count_documents(query_7d)
                
                # Tổng hợp kết quả
                stats = {
                    "total_users": sum(r["total_users"] for r in results),
                    "total_requests": sum(r["total_requests"] for r in results),
                    "active_users_24h": active_24h,
                    "active_users_7d": active_7d,
                    "api_keys": [
                        {
                            "api_key": r["_id"],
                            "total_users": r["total_users"],
                            "total_requests": r["total_requests"],
                            "last_request": r["last_request"].isoformat()
                        }
                        for r in results
                    ]
                }
                
                return stats
            else:
                # Lưu trữ file
                api_users_dir = os.path.join(self.data_dir, "api_users")
                
                if not os.path.exists(api_users_dir):
                    return {
                        "total_users": 0,
                        "total_requests": 0,
                        "active_users_24h": 0,
                        "active_users_7d": 0,
                        "api_keys": []
                    }
                
                # Các thư mục API key cần xử lý
                api_key_dirs = []
                
                if api_key:
                    api_key_dir = os.path.join(api_users_dir, self._sanitize_filename(api_key))
                    if os.path.exists(api_key_dir) and os.path.isdir(api_key_dir):
                        api_key_dirs.append((api_key, api_key_dir))
                else:
                    # Tất cả thư mục API key
                    for dir_name in os.listdir(api_users_dir):
                        dir_path = os.path.join(api_users_dir, dir_name)
                        if os.path.isdir(dir_path):
                            api_key_dirs.append((dir_name, dir_path))
                
                # Khởi tạo kết quả
                stats = {
                    "total_users": 0,
                    "total_requests": 0,
                    "active_users_24h": 0,
                    "active_users_7d": 0,
                    "api_keys": []
                }
                
                for api_key_name, api_key_path in api_key_dirs:
                    api_key_stats = {
                        "api_key": api_key_name,
                        "total_users": 0,
                        "total_requests": 0,
                        "last_request": None
                    }
                    
                    # Đọc tất cả file người dùng
                    user_files = [
                        f for f in os.listdir(api_key_path)
                        if f.endswith('.json') and f != "_summary.json"
                    ]
                    
                    active_users_24h = 0
                    active_users_7d = 0
                    total_requests = 0
                    total_users = 0
                    last_request = None
                    
                    for file_name in user_files:
                        file_path = os.path.join(api_key_path, file_name)
                        
                        with open(file_path, "r", encoding="utf-8") as f:
                            user_data = json.load(f)
                        
                        # Chuyển đổi string thành datetime
                        last_active = datetime.fromisoformat(user_data["last_active"])
                        
                        # Chỉ tính người dùng trong khoảng thời gian
                        if last_active >= since:
                            total_users += 1
                            total_requests += user_data["total_requests"]
                            
                            # Cập nhật thời gian cuối cùng
                            if last_request is None or last_active > last_request:
                                last_request = last_active
                            
                            # Kiểm tra hoạt động trong 24h
                            if last_active >= now - timedelta(hours=24):
                                active_users_24h += 1
                            
                            # Kiểm tra hoạt động trong 7 ngày
                            if last_active >= now - timedelta(days=7):
                                active_users_7d += 1
                    
                    # Cập nhật thống kê API key
                    api_key_stats["total_users"] = total_users
                    api_key_stats["total_requests"] = total_requests
                    if last_request:
                        api_key_stats["last_request"] = last_request.isoformat()
                    
                    # Cập nhật thống kê tổng
                    stats["total_users"] += total_users
                    stats["total_requests"] += total_requests
                    stats["active_users_24h"] += active_users_24h
                    stats["active_users_7d"] += active_users_7d
                    
                    # Thêm vào danh sách API keys
                    if total_users > 0:
                        stats["api_keys"].append(api_key_stats)
                
                # Sắp xếp API keys theo thời gian sử dụng gần nhất
                stats["api_keys"].sort(
                    key=lambda x: x["last_request"] if x["last_request"] else "0", 
                    reverse=True
                )
                
                return stats
        except Exception as e:
            logger.error(f"Lỗi khi lấy thống kê sử dụng API: {str(e)}")
            return {
                "total_users": 0,
                "total_requests": 0,
                "active_users_24h": 0,
                "active_users_7d": 0,
                "api_keys": [],
                "error": str(e)
            }