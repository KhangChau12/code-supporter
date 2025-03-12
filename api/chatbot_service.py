"""
Module chuyên biệt cho dịch vụ chatbot Code Supporter
"""
from together import Together
import os
from dotenv import load_dotenv
import logging

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

class CodeSupporterService:
    def __init__(self, api_key=None):
        """Khởi tạo dịch vụ chatbot với API key"""
        self.api_key = api_key or os.getenv("TOGETHER_API_KEY")
        if not self.api_key:
            logger.error("API key cho Together API không được cung cấp")
            raise ValueError("API key cho Together API không được cung cấp")
            
        self.client = Together(api_key=self.api_key)
        self.system_prompt = (
            "Bạn là một trợ lý viết code hỗ trợ học sinh với các bài tập lập trình. "
            "Thay vì đưa code liền dù học sinh chỉ mới gửi bài, hãy mô tả logic của code và giải thích cách thuật toán hoạt động. "
            "Lưu ý, chỉ đưa code trực tiếp khi và chỉ khi học sinh yêu cầu rõ ràng trong tin nhắn, nếu không thì tập trung vào giải thích logic và ý tưởng giải giúp học sinh tự viết code và hỏi rằng học sinh có cần đưa code thẳng không. "
            "Ngoài việc sinh code, bạn cũng có thể giải thích các thắc mắc liên quan đến lập trình và nếu người dùng có hỏi điều gì ngoài lập trình thì bạn vẫn đối thoại được như bình thường"
        )
        logger.info("Khởi tạo dịch vụ Code Supporter thành công")
    
    def generate_response(self, user_message, conversation_history=None):
        """
        Tạo phản hồi từ mô hình cho tin nhắn của người dùng
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            conversation_history (list, optional): Lịch sử hội thoại
            
        Returns:
            str: Phản hồi từ mô hình
        """
        try:
            # Tạo ngữ cảnh từ lịch sử hội thoại nếu có
            context = ""
            if conversation_history and len(conversation_history) > 0:
                context = "\n".join([f"{entry['role']}: {entry['content']}" for entry in conversation_history])
                context = f"Dữ liệu từ cơ sở dữ liệu:\n{context}\n\n"
            
            prompt = f"{context}Câu hỏi của người dùng: {user_message}\n\n"
            
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            logger.info(f"Gửi yêu cầu đến mô hình Meta Llama với tin nhắn: {user_message[:50]}...")
            
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                top_p=0.7,
                top_k=50,
                repetition_penalty=1,
                stop=["<|eot_id|>", "<|eom_id|>"],
                stream=False
            )
            
            bot_response = response.choices[0].message.content
            logger.info(f"Nhận phản hồi từ mô hình: {bot_response[:50]}...")
            
            return bot_response
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo phản hồi: {str(e)}")
            return f"Xin lỗi, đã xảy ra lỗi: {str(e)}"
            
    def generate_response_stream(self, user_message, conversation_history=None):
        """
        Tạo phản hồi từ mô hình theo kiểu stream
        
        Args:
            user_message (str): Tin nhắn từ người dùng
            conversation_history (list, optional): Lịch sử hội thoại
            
        Returns:
            generator: Generator trả về từng phần của phản hồi
        """
        try:
            # Tạo ngữ cảnh từ lịch sử hội thoại nếu có
            context = ""
            if conversation_history and len(conversation_history) > 0:
                context = "\n".join([f"{entry['role']}: {entry['content']}" for entry in conversation_history])
                context = f"Dữ liệu từ cơ sở dữ liệu:\n{context}\n\n"
            
            prompt = f"{context}Câu hỏi của người dùng: {user_message}\n\n"
            
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            logger.info(f"Gửi yêu cầu stream đến mô hình Meta Llama với tin nhắn: {user_message[:50]}...")
            
            response_stream = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                top_p=0.7,
                top_k=50,
                repetition_penalty=1,
                stop=["<|eot_id|>", "<|eom_id|>"],
                stream=True
            )
            
            for chunk in response_stream:
                if hasattr(chunk.choices[0], 'delta') and hasattr(chunk.choices[0].delta, 'content'):
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo phản hồi stream: {str(e)}")
            yield f"Xin lỗi, đã xảy ra lỗi: {str(e)}"
