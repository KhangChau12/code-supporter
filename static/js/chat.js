// chat.js - Xử lý chức năng chat với hỗ trợ streaming
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const themeToggle = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    
    // Biến lưu trạng thái
    let savedSnippets = JSON.parse(localStorage.getItem('savedCodeSnippets')) || [];
    let isWaitingForResponse = false;
    
    // Kiểm tra các phần tử DOM tồn tại trước khi thêm event listeners
    if (themeToggle) {
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
    }
    
    if (logoutButton) {
        // Xử lý đăng xuất
        logoutButton.addEventListener('click', function() {
            // Xóa cookie token
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            // Chuyển hướng về trang đăng nhập
            window.location.href = '/login';
        });
    }
    
    if (messageInput) {
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
    }
    
    if (sendButton) {
        // Xử lý nút gửi
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Khởi tạo syntax highlighting
    initCodeHighlighting();
    
    // Hàm gửi tin nhắn
    function sendMessage() {
        // Kiểm tra messageInput tồn tại và không đang chờ phản hồi
        if (!messageInput || isWaitingForResponse) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Hiển thị tin nhắn của người dùng
        addMessage(message, 'user');
        
        // Xóa nội dung input và reset kích thước
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Vô hiệu hóa input và nút gửi
        messageInput.disabled = true;
        if (sendButton) sendButton.disabled = true;
        isWaitingForResponse = true;
        
        // Hiển thị typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Sử dụng fetch để kết nối tới API stream
        streamChatResponse(message, typingIndicator);
    }

    // Hàm xử lý stream chat response
    function streamChatResponse(message, typingIndicator) {
        // Chuẩn bị response container
        const responseMsgDiv = document.createElement('div');
        responseMsgDiv.className = 'message bot-message';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        responseMsgDiv.appendChild(contentDiv);
        
        // Thêm timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(new Date());
        responseMsgDiv.appendChild(timeDiv);
        
        // Biến lưu nội dung tích lũy
        let accumulatedContent = '';
        
        // Gửi request đến endpoint stream
        fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ message })
        }).then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            
            // Xóa typing indicator
            if (typingIndicator) typingIndicator.remove();
            
            // Thêm response container vào messages
            messagesContainer.appendChild(responseMsgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Xử lý stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            function processStream({ done, value }) {
                if (done) {
                    // Hoàn thành, cập nhật final formatting và bật lại input
                    contentDiv.innerHTML = formatMarkdown(accumulatedContent);
                    
                    // Thêm nút copy cho code blocks
                    setTimeout(() => {
                        responseMsgDiv.querySelectorAll('pre').forEach(pre => {
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
                    
                    // Kích hoạt lại input và nút gửi
                    messageInput.disabled = false;
                    if (sendButton) sendButton.disabled = false;
                    messageInput.focus();
                    isWaitingForResponse = false;
                    
                    return;
                }
                
                // Xử lý chunk dữ liệu
                const chunk = decoder.decode(value, { stream: true });
                const events = chunk.split('\n\n');
                
                for (const event of events) {
                    if (event.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(event.substring(6));
                            
                            if (!data.done) {
                                // Cập nhật nội dung tích lũy và hiển thị
                                accumulatedContent += data.chunk;
                                
                                // Hiển thị nội dung sơ bộ (không cần format markdown đầy đủ để tăng hiệu suất)
                                // Chỉ xử lý một số markdown đơn giản trong quá trình stream
                                contentDiv.innerHTML = simpleMarkdownFormat(accumulatedContent);
                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            }
                        } catch (e) {
                            console.error('Lỗi xử lý event stream:', e);
                        }
                    }
                }
                
                // Tiếp tục đọc stream
                return reader.read().then(processStream);
            }
            
            // Bắt đầu xử lý stream
            return reader.read().then(processStream);
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Xóa typing indicator
            if (typingIndicator) typingIndicator.remove();
            
            // Hiển thị thông báo lỗi
            addMessage('Đã xảy ra lỗi khi kết nối với server: ' + error.message, 'bot');
            
            // Kích hoạt lại input và nút gửi
            messageInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            messageInput.focus();
            isWaitingForResponse = false;
        });
    }
    
    // Hàm định dạng markdown đơn giản cho streaming (chỉ xử lý cơ bản)
    function simpleMarkdownFormat(text) {
        // Chỉ xử lý các định dạng đơn giản trong quá trình stream để tăng hiệu suất
        let formatted = text;
        // Xử lý inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Xử lý bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Xử lý italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Xử lý xuống dòng
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    // Hàm thêm tin nhắn vào khung chat
    function addMessage(content, sender) {
        // Kiểm tra messagesContainer tồn tại
        if (!messagesContainer) return;
        
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
        // Kiểm tra messagesContainer tồn tại
        if (!messagesContainer) return null;
        
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
    
    // Hàm định dạng markdown đầy đủ
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
    
    // Khởi tạo syntax highlighting
    function initCodeHighlighting() {
        // Nếu chưa có Prism.js, load từ CDN
        if (!window.Prism && typeof document !== 'undefined') {
            document.addEventListener('DOMContentLoaded', function() {
                const prismCSS = document.createElement('link');
                prismCSS.rel = 'stylesheet';
                prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css';
                document.head.appendChild(prismCSS);
                
                const prismScript = document.createElement('script');
                prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js';
                document.head.appendChild(prismScript);
                
                // Load thêm các ngôn ngữ phổ biến
                const languages = ['javascript', 'python', 'java', 'php', 'csharp', 'cpp', 'ruby', 'bash', 'sql', 'html', 'css'];
                languages.forEach(lang => {
                    const langScript = document.createElement('script');
                    langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-${lang}.min.js`;
                    document.head.appendChild(langScript);
                });
            });
        }
    }
    
    // Đặt focus vào input khi trang được tải
    if (messageInput) {
        setTimeout(() => {
            messageInput.focus();
        }, 100);
    }
    
    // Kiểm tra nếu messagesContainer tồn tại và trống
    if (messagesContainer && messagesContainer.childElementCount === 0) {
        // Tạo tin nhắn chào mừng
        addMessage('Xin chào! Tôi là trợ lý Code Supporter. Bạn cần giúp đỡ gì về lập trình?', 'bot');
    }
});