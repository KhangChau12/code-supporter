"""
Module chuyên biệt cho dịch vụ chatbot Code Supporter
Cập nhật: Sử dụng Together API phiên bản mới
"""
from together import Together
import os
from dotenv import load_dotenv
import logging
import time
import backoff
from typing import List, Dict, Any, Generator, Optional

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

# Decorator cho backoff retry
def on_api_error(e):
    """
    Hàm xử lý lỗi khi cần retry
    """
    logger.warning(f"Lỗi gọi API, thử lại: {str(e)}")

class CodeSupporterService:
    def __init__(self, api_key=None, model_name=None):
        """
        Khởi tạo dịch vụ chatbot với API key và model
        
        Args:
            api_key (str, optional): API key cho TogetherAI
            model_name (str, optional): Tên model muốn sử dụng
        """
        self.api_key = api_key or os.getenv("TOGETHER_API_KEY")
        if not self.api_key:
            logger.error("API key cho Together API không được cung cấp")
            raise ValueError("API key cho Together API không được cung cấp")
        
        self.model_name = model_name or os.getenv("TOGETHER_MODEL_NAME", "meta-llama/Llama-3.3-70B-Instruct-Turbo")
        
        # Các thông số mặc định
        self.default_params = {
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.7,
            "top_k": 50,
            "repetition_penalty": 1,
            "stop": ["<|eot_id|>", "<|eom_id|>"]
        }
        
        # Khởi tạo kết nối API - cập nhật cho phiên bản Together mới
        try:
            # Đặt API key thông qua biến môi trường
            os.environ["TOGETHER_API_KEY"] = self.api_key
            self.client = Together()
            logger.info(f"Khởi tạo dịch vụ Code Supporter thành công với model {self.model_name}")
        except Exception as e:
            logger.error(f"Lỗi khởi tạo kết nối Together API: {str(e)}")
            raise
        
        # Prompt hệ thống mặc định
        self.system_prompt = (
            "Bạn là một trợ lý viết code hỗ trợ học sinh với các bài tập lập trình. Bạn được finetune và chỉnh sửa bỏi Châu Phúc Khang. "
            "Thay vì đưa code liền dù học sinh chỉ mới gửi bài, hãy mô tả logic của code và giải thích cách thuật toán hoạt động. "
            "Lưu ý, chỉ đưa code trực tiếp khi và chỉ khi học sinh yêu cầu rõ ràng trong tin nhắn, nếu không thì tập trung vào giải thích logic và ý tưởng giải giúp học sinh tự viết code và hỏi rằng học sinh có cần đưa code thẳng không. "
            "Ngoài việc sinh code, bạn cũng có thể giải thích các thắc mắc liên quan đến lập trình và nếu người dùng có hỏi điều gì ngoài lập trình thì bạn vẫn đối thoại được như bình thường"
        )
    
    def _format_messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """
        Chuyển đổi danh sách messages thành prompt dạng văn bản cho API
        
        Args:
            messages (list): Danh sách các tin nhắn với role và content
            
        Returns:
            str: Prompt dạng văn bản
        """
        prompt = ""
        
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            
            if role == "system":
                prompt += f"<|im_start|>system\n{content}<|im_end|>\n"
            elif role == "user":
                prompt += f"<|im_start|>user\n{content}<|im_end|>\n"
            elif role == "assistant":
                prompt += f"<|im_start|>assistant\n{content}<|im_end|>\n"
        
        # Thêm phần bắt đầu cho phản hồi của assistant
        prompt += "<|im_start|>assistant\n"
        
        return prompt
    
    @backoff.on_exception(backoff.expo, 
                         (Exception),
                         max_tries=3,
                         on_backoff=on_api_error)
    def generate_response(self, user_message: str, conversation_history: Optional[List[Dict[str, str]]] = None, 
                         custom_params: Optional[Dict[str, Any]] = None) -> str:
        """
        Tạo phản hồi từ mô hình cho tin nhắn của người dùng
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            conversation_history (list, optional): Lịch sử hội thoại
            custom_params (dict, optional): Các tham số tùy chỉnh cho API call
            
        Returns:
            str: Phản hồi từ mô hình
        """
        try:
            start_time = time.time()
            
            # Tạo ngữ cảnh từ lịch sử hội thoại nếu có
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Thêm lịch sử hội thoại nếu có
            if conversation_history and len(conversation_history) > 0:
                for entry in conversation_history:
                    messages.append({
                        "role": entry["role"],
                        "content": entry["content"]
                    })
            
            # Thêm tin nhắn hiện tại của người dùng
            messages.append({"role": "user", "content": user_message})
            
            logger.info(f"Gửi yêu cầu đến mô hình {self.model_name} với tin nhắn: {user_message[:50]}...")
            
            # Kết hợp tham số mặc định và tùy chỉnh
            params = self.default_params.copy()
            if custom_params:
                params.update(custom_params)
            
            # Chuyển đổi messages thành prompt dạng văn bản
            prompt = self._format_messages_to_prompt(messages)
            
            # Gọi API với Together phiên bản mới
            response = self.client.completions.create(
                model=self.model_name,
                prompt=prompt,
                **params
            )
            
            elapsed_time = time.time() - start_time
            
            # Trích xuất phản hồi từ output
            bot_response = response.choices[0].text.strip()
            # Loại bỏ token kết thúc nếu có
            for stop_token in params.get('stop', []):
                if bot_response.endswith(stop_token):
                    bot_response = bot_response[:-(len(stop_token))]
            
            # Loại bỏ token im_end nếu có
            if "<|im_end|>" in bot_response:
                bot_response = bot_response.split("<|im_end|>")[0].strip()
            
            logger.info(f"Nhận phản hồi từ mô hình sau {elapsed_time:.2f}s: {bot_response[:50]}...")
            
            return bot_response
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo phản hồi: {str(e)}")
            # Tạo phản hồi lỗi thân thiện hơn
            error_message = "Xin lỗi, tôi đang gặp khó khăn trong việc xử lý yêu cầu của bạn. "
            if "rate limit" in str(e).lower():
                error_message += "Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau vài giây."
            elif "timeout" in str(e).lower():
                error_message += "Kết nối đến máy chủ bị chậm. Vui lòng thử lại."
            else:
                error_message += f"Lỗi cụ thể: {str(e)}. Vui lòng thử lại hoặc đặt câu hỏi theo cách khác."
            
            return error_message
            
    @backoff.on_exception(backoff.expo, 
                         (Exception),
                         max_tries=3,
                         on_backoff=on_api_error)
    def generate_response_stream(self, user_message: str, 
                               conversation_history: Optional[List[Dict[str, str]]] = None,
                               custom_params: Optional[Dict[str, Any]] = None) -> Generator[str, None, None]:
        """
        Tạo phản hồi từ mô hình theo kiểu stream
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            conversation_history (list, optional): Lịch sử hội thoại
            custom_params (dict, optional): Các tham số tùy chỉnh cho API call
            
        Returns:
            generator: Generator trả về từng phần của phản hồi
        """
        try:
            start_time = time.time()
            
            # Tạo messages từ lịch sử hội thoại và tin nhắn hiện tại
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Thêm lịch sử hội thoại nếu có
            if conversation_history and len(conversation_history) > 0:
                for entry in conversation_history:
                    messages.append({
                        "role": entry["role"],
                        "content": entry["content"]
                    })
            
            # Thêm tin nhắn hiện tại của người dùng
            messages.append({"role": "user", "content": user_message})
            
            logger.info(f"Gửi yêu cầu stream đến mô hình {self.model_name} với tin nhắn: {user_message[:50]}...")
            
            # Kết hợp tham số mặc định và tùy chỉnh
            params = self.default_params.copy()
            if custom_params:
                params.update(custom_params)
            # Đảm bảo stream=True cho phản hồi theo stream
            params["stream"] = True
            
            # Chuyển đổi messages thành prompt dạng văn bản
            prompt = self._format_messages_to_prompt(messages)
            
            # Gọi API với stream sử dụng Together phiên bản mới
            response_stream = self.client.completions.create(
                model=self.model_name,
                prompt=prompt,
                **params
            )
            
            chunk_count = 0
            accumulated_text = ""
            
            for chunk in response_stream:
                chunk_count += 1
                
                if hasattr(chunk.choices[0], 'text'):
                    text = chunk.choices[0].text
                    
                    if text:
                        # Check for end tokens and remove them
                        for stop_token in params.get('stop', []):
                            if stop_token in text:
                                text = text.split(stop_token)[0]
                                
                        # Check for im_end token
                        if "<|im_end|>" in text:
                            text = text.split("<|im_end|>")[0]
                        
                        # Only yield new content
                        yield text
            
            elapsed_time = time.time() - start_time
            logger.info(f"Stream hoàn thành sau {elapsed_time:.2f}s với {chunk_count} chunks")
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo phản hồi stream: {str(e)}")
            yield f"Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn: {str(e)}. Vui lòng thử lại."
    
    def set_system_prompt(self, new_prompt: str) -> None:
        """
        Thay đổi system prompt
        
        Args:
            new_prompt (str): System prompt mới
        """
        self.system_prompt = new_prompt
        logger.info("Đã cập nhật system prompt")
    
    def update_default_params(self, params: Dict[str, Any]) -> None:
        """
        Cập nhật các tham số mặc định
        
        Args:
            params (dict): Các tham số mới
        """
        self.default_params.update(params)
        logger.info(f"Đã cập nhật tham số mặc định: {params}")