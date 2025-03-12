"""
Module quản lý lưu trữ dữ liệu cho Code Supporter
"""
import os
from dotenv import load_dotenv
import logging
import json
import pymongo
from datetime import datetime
import hashlib
import uuid

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
            self.db_uri = db_uri or os.getenv("MONGO_URI")
            
            if not self.db_uri:
                # Nếu không có URI MongoDB, sử dụng lưu trữ file
                logger.warning("Không tìm thấy URI MongoDB, sử dụng lưu trữ file")
                self.storage_type = "file"
                self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
                os.makedirs(self.data_dir, exist_ok=True)
            else:
                # Kết nối MongoDB
                self.storage_type = "mongodb"
                self.client = pymongo.MongoClient(self.db_uri)
                self.db = self.client.codesupporter
                logger.info("Kết nối MongoDB thành công")
                
        except Exception as e:
            logger.error(f"Lỗi khởi tạo lưu trữ: {str(e)}")
            # Fallback sang lưu trữ file nếu kết nối MongoDB thất bại
            self.storage_type = "file"
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(self.data_dir, exist_ok=True)
            logger.warning("Chuyển sang sử dụng lưu trữ file")
    
    def _hash_password(self, password):
        """Hash mật khẩu sử dụng SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_user(self, username, password):
        """Tạo tài khoản người dùng mới"""
        try:
            if self.storage_type == "mongodb":
                # Kiểm tra xem người dùng đã tồn tại chưa
                if self.db.users.find_one({"username": username}):
                    return False, "Tên đăng nhập đã tồn tại"
                
                # Tạo tài khoản mới
                user_data = {
                    "username": username,
                    "password": self._hash_password(password),
                    "created_at": datetime.now(),
                    "last_login": None
                }
                self.db.users.insert_one(user_data)
                
            else:
                # Lưu trữ file
                users_file = os.path.join(self.data_dir, "users.json")
                
                if os.path.exists(users_file):
                    with open(users_file, "r", encoding="utf-8") as f:
                        users = json.load(f)
                else:
                    users = []
                
                # Kiểm tra xem người dùng đã tồn tại chưa
                if any(user["username"] == username for user in users):
                    return False, "Tên đăng nhập đã tồn tại"
                
                # Tạo tài khoản mới
                user_data = {
                    "username": username,
                    "password": self._hash_password(password),
                    "created_at": datetime.now().isoformat(),
                    "last_login": None
                }
                users.append(user_data)
                
                with open(users_file, "w", encoding="utf-8") as f:
                    json.dump(users, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Tạo tài khoản thành công cho {username}")
            return True, "Tạo tài khoản thành công"
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo tài khoản: {str(e)}")
            return False, f"Lỗi: {str(e)}"
    
    def authenticate_user(self, username, password):
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
                users_file = os.path.join(self.data_dir, "users.json")
                
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
    
    def save_conversation(self, username, role, content):
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
                conversations_file = os.path.join(self.data_dir, "conversations.json")
                
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
    
    def get_conversation_history(self, username, limit=10):
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
                # Lưu trữ file
                conversations_file = os.path.join(self.data_dir, "conversations.json")
                
                if not os.path.exists(conversations_file):
                    return []
                
                with open(conversations_file, "r", encoding="utf-8") as f:
                    all_conversations = json.load(f)
                
                # Lọc hội thoại của người dùng
                user_conversations = [
                    conv for conv in all_conversations
                    if conv["username"] == username
                ]
                
                # Sắp xếp theo thời gian (cũ đến mới)
                user_conversations.sort(key=lambda x: x["timestamp"])
                
                # Lấy limit tin nhắn gần nhất
                recent_conversations = user_conversations[-limit:] if len(user_conversations) > limit else user_conversations
                
                return [{
                    "role": conv["role"],
                    "content": conv["content"]
                } for conv in recent_conversations]
                
        except Exception as e:
            logger.error(f"Lỗi khi lấy lịch sử hội thoại: {str(e)}")
            return []
    
    def create_api_key(self, name, permissions=None):
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
                "last_used": None
            }
            
            if self.storage_type == "mongodb":
                self.db.api_keys.insert_one(api_data)
            else:
                # Lưu trữ file
                api_keys_file = os.path.join(self.data_dir, "api_keys.json")
                
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
    
    def verify_api_key(self, api_key):
        """Xác thực API key"""
        try:
            if self.storage_type == "mongodb":
                key_data = self.db.api_keys.find_one({"key": api_key})
                
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
                api_keys_file = os.path.join(self.data_dir, "api_keys.json")
                
                if not os.path.exists(api_keys_file):
                    return False, []
                
                with open(api_keys_file, "r", encoding="utf-8") as f:
                    api_keys = json.load(f)
                
                for i, key_data in enumerate(api_keys):
                    if key_data["key"] == api_key:
                        # Cập nhật thời gian sử dụng
                        api_keys[i]["last_used"] = datetime.now().isoformat()
                        
                        with open(api_keys_file, "w", encoding="utf-8") as f:
                            json.dump(api_keys, f, ensure_ascii=False, indent=2)
                        
                        return True, key_data["permissions"]
                
                return False, []
                
        except Exception as e:
            logger.error(f"Lỗi khi xác thực API key: {str(e)}")
            return False, []
