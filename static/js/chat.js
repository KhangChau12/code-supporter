// chat.js - Xử lý chức năng chat
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const themeToggle = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    
    // Kiểm tra và áp dụng theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Xử lý chuyển đổi theme
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
    });
    
    // Xử lý đăng xuất
    logoutButton.addEventListener('click', function() {
        // Xóa cookie token
        document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Chuyển hướng về trang đăng nhập
        window.location.href = '/login';
    });
    
    // Điều chỉnh kích thước textarea theo nội dung
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight > 120 ? 120 : this.scrollHeight) + 'px';
    });
    
    // Xử lý gửi tin nhắn khi nhấn Enter (không phải Shift+Enter)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Xử lý nút gửi
    sendButton.addEventListener('click', sendMessage);
    
    // Hàm gửi tin nhắn
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Hiển thị tin nhắn của người dùng
        addMessage(message, 'user');
        
        // Xóa nội dung input và reset kích thước
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Vô hiệu hóa input và nút gửi
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        // Hiển thị typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Gửi tin nhắn đến server
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            // Xóa typing indicator
            typingIndicator.remove();
            
            // Hiển thị phản hồi
            if (data.reply) {
                addMessage(data.reply, 'bot');
            } else {
                addMessage('Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.', 'bot');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Xóa typing indicator
            typingIndicator.remove();
            
            // Hiển thị thông báo lỗi
            addMessage('Đã xảy ra lỗi khi kết nối với server.', 'bot');
        })
        .finally(() => {
            // Kích hoạt lại input và nút gửi
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        });
    }
    
    // Hàm thêm tin nhắn vào khung chat
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'bot') {
            // Xử lý Markdown cho tin nhắn bot
            contentDiv.innerHTML = formatMarkdown(content);
            
            // Thêm nút copy cho code blocks
            setTimeout(() => {
                messageDiv.querySelectorAll('pre').forEach(pre => {
                    if (!pre.querySelector('.copy-code-btn')) {
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'copy-code-btn';
                        copyBtn.textContent = 'Copy';
                        copyBtn.addEventListener('click', () => {
                            const code = pre.querySelector('code').textContent;
                            navigator.clipboard.writeText(code).then(() => {
                                copyBtn.textContent = 'Copied!';
                                setTimeout(() => {
                                    copyBtn.textContent = 'Copy';
                                }, 2000);
                            });
                        });
                        pre.appendChild(copyBtn);
                    }
                });
            }, 100);
        } else {
            // Escape HTML cho tin nhắn người dùng
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Thêm timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(new Date());
        messageDiv.appendChild(timeDiv);
        
        // Thêm vào container
        messagesContainer.appendChild(messageDiv);
        
        // Scroll xuống cuối
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Hàm hiển thị typing indicator
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            indicator.appendChild(dot);
        }
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return indicator;
    }
    
    // Hàm định dạng markdown đơn giản
    function formatMarkdown(text) {
        // Xử lý code blocks (```code```)
        let formatted = text.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, language, code) {
            return `<pre><code class="language-${language}">${escapeHTML(code)}</code></pre>`;
        });
        
        // Xử lý inline code (`code`)
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Xử lý bold (**text**)
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Xử lý italic (*text*)
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Xử lý headings (## heading)
        formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Xử lý bullet lists
        formatted = formatted.replace(/^\s*[\-\*] (.*)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Xử lý numeric lists
        formatted = formatted.replace(/^\s*(\d+)\. (.*)$/gm, '<li>$2</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        
        // Xử lý links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Xử lý xuống dòng
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    // Hàm escape HTML
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Hàm định dạng thời gian
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Hàm lấy token từ cookie
    function getToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
                return value;
            }
        }
        return null;
    }
    
    // Đặt focus vào input khi trang được tải
    messageInput.focus();
    
    // Tạo tin nhắn chào mừng
    addMessage('Xin chào! Tôi là trợ lý Code Supporter. Bạn cần giúp đỡ gì về lập trình?', 'bot');
});
