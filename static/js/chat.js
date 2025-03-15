// chat.js - Xử lý chức năng chat với hiệu ứng typing mượt mà
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
    let typingAnimationTimeout = null;
    let typingSpeed = 3; // Tốc độ hiển thị mặc định (ms)
    
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

    // Hàm xử lý stream chat response với hiệu ứng typing
    function streamChatResponse(message, typingIndicator) {
        let textBuffer = ''; // Buffer văn bản đã nhận nhưng chưa hiển thị
        let isDisplaying = false; // Đang trong quá trình hiển thị hay không
        let displayedText = ''; // Văn bản đã hiển thị
        let responseContainer = null; // Container của phản hồi
        let receivedFullResponse = false; // Đã nhận toàn bộ phản hồi hay chưa

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
            
            // Xử lý stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Tạo message container cho bot response
            if (!responseContainer) {
                responseContainer = createResponseContainer();
            }
            
            function processStream({ done, value }) {
                if (done) {
                    // Đánh dấu đã nhận hết nội dung
                    receivedFullResponse = true;
                    
                    // Đảm bảo tất cả text đã được hiển thị
                    if (textBuffer.length > 0) {
                        // Nếu đã hết stream mà vẫn còn text chưa hiển thị,
                        // thêm phần văn bản còn lại vào displayedText
                        const remainingText = textBuffer;
                        textBuffer = '';
                        
                        // Đảm bảo phần còn lại được đưa vào quá trình hiển thị
                        if (!isDisplaying) {
                            isDisplaying = true;
                            displayNextCharacter(responseContainer);
                        }
                    }
                    
                    return;
                }
                
                // Xử lý chunk dữ liệu
                const chunk = decoder.decode(value, { stream: true });
                const events = chunk.split('\n\n');
                
                for (const event of events) {
                    if (event.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(event.substring(6));
                            
                            if (!data.done && data.chunk) {
                                // Thêm text vào buffer
                                textBuffer += data.chunk;
                                
                                // Nếu chưa đang hiển thị, bắt đầu hiệu ứng typing
                                if (!isDisplaying) {
                                    isDisplaying = true;
                                    displayNextCharacter(responseContainer);
                                }
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
            
            // Xóa typing indicator nếu còn
            if (typingIndicator) typingIndicator.remove();
            
            // Xóa bất kỳ timeout nào đang chờ
            if (typingAnimationTimeout) {
                clearTimeout(typingAnimationTimeout);
            }
            
            // Hiển thị thông báo lỗi
            addMessage('Đã xảy ra lỗi khi kết nối với server: ' + error.message, 'bot');
            
            // Kích hoạt lại input và nút gửi
            messageInput.disabled = false;
            if (sendButton) sendButton.disabled = false;
            messageInput.focus();
            isWaitingForResponse = false;
        });

        // Tạo container cho phản hồi và loại bỏ typing indicator
        function createResponseContainer() {
            // Xóa typing indicator nếu có
            if (typingIndicator) typingIndicator.remove();
            
            // Tạo response container
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
            
            // Thêm vào container
            messagesContainer.appendChild(responseMsgDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            return responseMsgDiv;
        }

        // Hiển thị từng ký tự một để tạo hiệu ứng typing mượt mà
        function displayNextCharacter(container) {
            // Kiểm tra nếu không còn gì trong buffer và stream đã kết thúc
            if (textBuffer.length === 0) {
                if (receivedFullResponse) {
                    // Nếu đã nhận hết phản hồi, hoàn thiện format cuối cùng
                    finalizeResponse(container, displayedText);
                    
                    // Kích hoạt lại input và nút gửi
                    messageInput.disabled = false;
                    if (sendButton) sendButton.disabled = false;
                    messageInput.focus();
                    isWaitingForResponse = false;
                    
                    // Kết thúc hiệu ứng typing
                    isDisplaying = false;
                    return;
                } else {
                    // Nếu chưa nhận hết phản hồi, tạm dừng hiệu ứng typing
                    isDisplaying = false;
                    return;
                }
            }

            // Lấy ký tự tiếp theo từ buffer
            let nextChar = textBuffer[0];
            textBuffer = textBuffer.substring(1);
            displayedText += nextChar;

            // Tính tốc độ hiển thị dựa trên ký tự
            let currentSpeed = calculateTypingSpeed(nextChar);
            
            // Đặc biệt xử lý code block để hiển thị đẹp hơn
            if (isCodeBlockDelimiter(displayedText)) {
                // Hiển thị cả block code cùng lúc sẽ đẹp hơn
                let codeBlockContent = extractCodeBlockContent(textBuffer);
                if (codeBlockContent) {
                    displayedText += codeBlockContent;
                    textBuffer = textBuffer.substring(codeBlockContent.length);
                }
            }

            // Cập nhật nội dung
            const contentDiv = container.querySelector('.message-content');
            contentDiv.innerHTML = simpleMarkdownFormat(displayedText);
            
            // Đảm bảo luôn cuộn xuống cuối
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            // Lên lịch hiển thị ký tự tiếp theo
            typingAnimationTimeout = setTimeout(() => {
                displayNextCharacter(container);
            }, currentSpeed);
        }

        // Tính toán tốc độ typing dựa trên ký tự
        function calculateTypingSpeed(char) {
            // Hiệu ứng nghỉ ngắn tại các dấu câu
            if ('.!?;:'.includes(char)) {
                return 23; // Tạm dừng lâu hơn tại dấu câu
            } else if (','.includes(char)) {
                return 13; // Tạm dừng ngắn tại dấu phẩy
            } else if (char === '\n') {
                return 27; // Tạm dừng lâu hơn tại xuống dòng
            } else if (char === ' ') {
                return 8; // Dừng ngắn tại khoảng trắng
            } else {
                return typingSpeed; // Tốc độ mặc định cho các ký tự khác
            }
        }

        // Kiểm tra xem vị trí hiện tại có phải là bắt đầu/kết thúc code block
        function isCodeBlockDelimiter(text) {
            return text.endsWith('```');
        }

        // Trích xuất nội dung code block từ buffer nếu có thể
        function extractCodeBlockContent(buffer) {
            // Tìm đoạn code block kết thúc nếu có
            const endIndex = buffer.indexOf('```');
            if (endIndex !== -1) {
                return buffer.substring(0, endIndex + 3);
            }
            return null;
        }
        
        // Hoàn thiện định dạng và thêm tính năng tương tác sau khi streaming xong
        function finalizeResponse(container, text) {
            const contentDiv = container.querySelector('.message-content');
            
            // Cập nhật nội dung với định dạng đầy đủ
            contentDiv.innerHTML = formatMarkdown(text);
            
            // Thêm nút copy cho code blocks
            container.querySelectorAll('pre').forEach(pre => {
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
            
            // Highlight code nếu có thư viện Prism
            if (window.Prism) {
                container.querySelectorAll('pre code').forEach(block => {
                    Prism.highlightElement(block);
                });
            }
            
            // Đảm bảo scroll cuối cùng
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    // Hàm định dạng markdown đơn giản cho streaming
    function simpleMarkdownFormat(text) {
        // Phát hiện và xử lý code blocks
        let formatted = text;
        
        // Xử lý code blocks
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        formatted = formatted.replace(codeBlockRegex, function(match, language, code) {
            return `<pre><code class="language-${language}">${escapeHTML(code)}</code></pre>`;
        });
        
        // Xử lý inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Xử lý bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Xử lý italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Xử lý xuống dòng mà không phá vỡ các phần tử HTML
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
                
                // Highlight code nếu có Prism
                if (window.Prism) {
                    messageDiv.querySelectorAll('pre code').forEach(block => {
                        Prism.highlightElement(block);
                    });
                }
            }, 50);
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