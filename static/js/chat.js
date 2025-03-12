// chat.js - Xử lý chức năng chat với UI/UX cải tiến
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const themeToggle = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    
    // Biến lưu trạng thái
    let savedSnippets = JSON.parse(localStorage.getItem('savedCodeSnippets')) || [];
    
    // Kiểm tra và áp dụng theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Xử lý chuyển đổi theme
    themeToggle.addEventListener('click', function() {
        // Hiệu ứng ripple
        createRippleEffect(this);
        
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        
        // Thông báo
        showSnackbar(`Đã chuyển sang chế độ ${document.body.classList.contains('light-mode') ? 'sáng' : 'tối'}`, 'info');
    });
    
    // Xử lý đăng xuất
    logoutButton.addEventListener('click', function() {
        // Hiệu ứng ripple
        createRippleEffect(this);
        
        // Hiển thị thông báo đang đăng xuất
        showSnackbar('Đang đăng xuất...', 'info');
        
        setTimeout(() => {
            // Xóa cookie token
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            // Chuyển hướng về trang đăng nhập
            window.location.href = '/login';
        }, 1000);
    });
    
    // Điều chỉnh kích thước textarea theo nội dung
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight > 150 ? 150 : this.scrollHeight) + 'px';
    });
    
    // Xử lý gửi tin nhắn khi nhấn Enter (không phải Shift+Enter)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Xử lý nút gửi
    sendButton.addEventListener('click', function() {
        createRippleEffect(this);
        sendMessage();
    });
    
    // Khởi tạo Prism.js cho code highlighting
    initCodeHighlighting();
    
    // Khởi tạo UI
    initializeUI();
    
    // Hàm gửi tin nhắn
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Hiển thị tin nhắn của người dùng với animation
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
            
            // Hiển thị phản hồi với delay nhỏ để tạo hiệu ứng chat tự nhiên
            setTimeout(() => {
                if (data.reply) {
                    // Phát hiện có nên hiển thị nút quick reply không
                    let botReply = data.reply;
                    let quickReplies = [];
                    
                    // Trích xuất các gợi ý phản hồi nhanh (nếu có)
                    if (botReply.includes('[[quick_replies:')) {
                        const match = botReply.match(/\[\[quick_replies:(.*?)\]\]/);
                        if (match && match[1]) {
                            quickReplies = match[1].split(',').map(item => item.trim());
                            botReply = botReply.replace(/\[\[quick_replies:.*?\]\]/, '');
                        }
                    }
                    
                    addMessage(botReply, 'bot', quickReplies);
                } else {
                    addMessage('Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.', 'bot');
                }
            }, 300);
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
    function addMessage(content, sender, quickReplies = []) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'bot') {
            // Xử lý Markdown cho tin nhắn bot
            contentDiv.innerHTML = formatMarkdown(content);
            
            // Thêm options button
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'message-options';
            optionsDiv.innerHTML = `
                <button class="options-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
                <div class="options-menu">
                    <div class="option-item copy-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Sao chép tin nhắn
                    </div>
                </div>
            `;
            messageDiv.appendChild(optionsDiv);
            
            // Thêm nút copy cho code blocks
            setTimeout(() => {
                // Xử lý code blocks với highlighting và line numbers
                messageDiv.querySelectorAll('pre code').forEach(codeBlock => {
                    // Tạo container cho pre
                    const preElement = codeBlock.parentElement;
                    const preContainer = document.createElement('div');
                    preContainer.className = 'code-container';
                    preElement.parentNode.insertBefore(preContainer, preElement);
                    preContainer.appendChild(preElement);
                    
                    // Detect language
                    let language = 'plaintext';
                    if (codeBlock.className) {
                        const match = codeBlock.className.match(/language-(\w+)/);
                        if (match) {
                            language = match[1];
                        }
                    }
                    
                    // Thêm label ngôn ngữ
                    const languageLabel = document.createElement('div');
                    languageLabel.className = 'language-label';
                    languageLabel.textContent = language;
                    preElement.appendChild(languageLabel);
                    
                    // Thêm nút copy
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-code-btn';
                    copyBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Sao chép
                    `;
                    preElement.appendChild(copyBtn);
                    
                    // Thêm nút preview
                    const previewBtn = document.createElement('button');
                    previewBtn.className = 'preview-code-btn';
                    previewBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                        </svg>
                        Xem chi tiết
                    `;
                    preElement.appendChild(previewBtn);
                    
                    // Thêm nút lưu snippet
                    const saveBtn = document.createElement('button');
                    saveBtn.className = 'save-code-btn';
                    saveBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Lưu
                    `;
                    preElement.appendChild(saveBtn);
                    
                    // Highlight code with Prism.js
                    if (window.Prism) {
                        Prism.highlightElement(codeBlock);
                    }
                    
                    // Thêm line numbers
                    addLineNumbers(codeBlock);
                    
                    // Xử lý sự kiện nút copy
                    copyBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const code = codeBlock.textContent;
                        navigator.clipboard.writeText(code).then(() => {
                            copyBtn.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Đã sao chép
                            `;
                            setTimeout(() => {
                                copyBtn.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Sao chép
                                `;
                            }, 2000);
                            
                            showSnackbar('Đã sao chép code vào clipboard', 'success');
                        });
                    });
                    
                    // Xử lý sự kiện nút preview
                    previewBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showCodePreview(codeBlock.textContent, language);
                    });
                    
                    // Xử lý sự kiện nút lưu
                    saveBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showSaveDialog(codeBlock.textContent, language);
                    });
                });
                
                // Xử lý sự kiện cho options button
                messageDiv.querySelectorAll('.options-button').forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.stopPropagation();
                        // Toggle options menu
                        const optionsMenu = this.nextElementSibling;
                        optionsMenu.classList.toggle('show');
                        
                        // Đóng menu khi click ra ngoài
                        document.addEventListener('click', function closeMenu() {
                            optionsMenu.classList.remove('show');
                            document.removeEventListener('click', closeMenu);
                        });
                    });
                    
                    // Xử lý nút copy message
                    const copyMessageBtn = button.nextElementSibling.querySelector('.copy-message');
                    copyMessageBtn.addEventListener('click', function() {
                        const messageText = this.closest('.message').querySelector('.message-content').textContent;
                        navigator.clipboard.writeText(messageText).then(() => {
                            showSnackbar('Đã sao chép tin nhắn vào clipboard', 'success');
                        });
                    });
                });
            }, 100);
            
            // Thêm quick replies nếu có
            if (quickReplies.length > 0) {
                const quickRepliesDiv = document.createElement('div');
                quickRepliesDiv.className = 'quick-replies';
                
                quickReplies.forEach(reply => {
                    const quickReplyBtn = document.createElement('button');
                    quickReplyBtn.className = 'quick-reply';
                    quickReplyBtn.textContent = reply;
                    quickReplyBtn.addEventListener('click', function() {
                        createRippleEffect(this);
                        messageInput.value = reply;
                        messageInput.focus();
                        // Tự động adjust height
                        messageInput.style.height = 'auto';
                        messageInput.style.height = (messageInput.scrollHeight > 150 ? 150 : messageInput.scrollHeight) + 'px';
                    });
                    quickRepliesDiv.appendChild(quickReplyBtn);
                });
                
                messageDiv.appendChild(quickRepliesDiv);
            }
        } else {
            // Escape HTML cho tin nhắn người dùng
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Thêm reactions cho tin nhắn bot
        if (sender === 'bot') {
            const reactionsDiv = document.createElement('div');
            reactionsDiv.className = 'message-reactions';
            reactionsDiv.innerHTML = `
                <button class="reaction-button like-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    Hữu ích
                </button>
                <button class="reaction-button dislike-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                    </svg>
                    Không hữu ích
                </button>
            `;
            messageDiv.appendChild(reactionsDiv);
            
            // Xử lý sự kiện reaction
            reactionsDiv.querySelectorAll('.reaction-button').forEach(btn => {
                btn.addEventListener('click', function() {
                    createRippleEffect(this);
                    const isLike = this.classList.contains('like-btn');
                    // Gửi feedback đến server (có thể thêm code sau)
                    showSnackbar(`Cảm ơn bạn đã đánh giá phản hồi ${isLike ? 'hữu ích' : 'không hữu ích'}`, 'success');
                    
                    // Disable cả 2 nút sau khi đã chọn
                    reactionsDiv.querySelectorAll('.reaction-button').forEach(b => {
                        b.classList.add('disabled');
                        b.disabled = true;
                    });
                    
                    // Highlight nút đã chọn
                    this.classList.add('selected');
                });
            });
        }
        
        // Thêm timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(new Date());
        messageDiv.appendChild(timeDiv);
        
        // Thêm vào container
        messagesContainer.appendChild(messageDiv);
        
        // Scroll xuống cuối với hiệu ứng mượt
        smoothScrollToBottom();
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
        smoothScrollToBottom();
        
        return indicator;
    }
    
    // Hàm làm mượt scroll xuống cuối
    function smoothScrollToBottom() {
        setTimeout(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
    
    // Hàm định dạng markdown với cải tiến
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
    
    // Hàm thêm line numbers cho code
    function addLineNumbers(codeBlock) {
        const code = codeBlock.textContent.split('\n');
        let numberedCode = '';
        
        code.forEach((line, index) => {
            numberedCode += `<span class="line">${line}</span>${index < code.length - 1 ? '\n' : ''}`;
        });
        
        codeBlock.innerHTML = numberedCode;
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
    
    // Hàm hiển thị snackbar notification
    function showSnackbar(message, type = 'info') {
        // Xóa snackbar cũ nếu có
        const existingSnackbar = document.querySelector('.snackbar');
        if (existingSnackbar) {
            existingSnackbar.remove();
        }
        
        const snackbar = document.createElement('div');
        snackbar.className = `snackbar snackbar-${type}`;
        
        // Icon khác nhau cho các loại thông báo
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                break;
            case 'error':
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                break;
            default:
                icon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
        
        snackbar.innerHTML = `${icon}<span>${message}</span>`;
        document.body.appendChild(snackbar);
        
        // Hiển thị snackbar
        setTimeout(() => {
            snackbar.classList.add('show');
        }, 10);
        
        // Ẩn sau 3 giây
        setTimeout(() => {
            snackbar.classList.remove('show');
            setTimeout(() => {
                snackbar.remove();
            }, 300);
        }, 3000);
    }
    
    // Khởi tạo syntax highlighting
    function initCodeHighlighting() {
        // Nếu chưa có Prism.js, load từ CDN
        if (!window.Prism) {
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
        }
    }
    
    // Hàm hiển thị dialog lưu code
    function showSaveDialog(code, language) {
        // Tạo dialog
        const saveDialog = document.createElement('div');
        saveDialog.className = 'save-dialog';
        saveDialog.innerHTML = `
            <div class="save-dialog-content">
                <div class="save-dialog-header">
                    <h3 class="save-dialog-title">Lưu đoạn code</h3>
                    <button class="save-dialog-close">&times;</button>
                </div>
                <div class="save-dialog-body">
                    <div class="save-dialog-field">
                        <label class="save-dialog-label">Tên đoạn code</label>
                        <input type="text" class="save-dialog-input" placeholder="Nhập tên để dễ dàng tìm lại sau này">
                    </div>
                    <div class="save-dialog-field">
                        <label class="save-dialog-label">Mô tả (tùy chọn)</label>
                        <input type="text" class="save-dialog-input" placeholder="Mô tả ngắn gọn về đoạn code">
                    </div>
                </div>
                <div class="save-dialog-footer">
                    <button class="save-dialog-button save-dialog-cancel">Hủy</button>
                    <button class="save-dialog-button save-dialog-save">Lưu lại</button>
                </div>
            </div>
        `;
        
        // Thêm vào body
        document.body.appendChild(saveDialog);
        
        // Hiển thị dialog
        setTimeout(() => {
            saveDialog.classList.add('show');
            saveDialog.querySelector('.save-dialog-input').focus();
        }, 10);
        
        // Xử lý đóng dialog
        const closeDialog = () => {
            saveDialog.classList.remove('show');
            setTimeout(() => {
                saveDialog.remove();
            }, 300);
        };
        
        // Xử lý sự kiện nút đóng
        saveDialog.querySelector('.save-dialog-close').addEventListener('click', closeDialog);
        saveDialog.querySelector('.save-dialog-cancel').addEventListener('click', closeDialog);
        
        // Xử lý sự kiện lưu
        saveDialog.querySelector('.save-dialog-save').addEventListener('click', () => {
            const name = saveDialog.querySelector('.save-dialog-input').value.trim();
            const description = saveDialog.querySelectorAll('.save-dialog-input')[1].value.trim();
            
            if (!name) {
                showSnackbar('Vui lòng nhập tên cho đoạn code', 'error');
                return;
            }
            
            // Lưu vào localStorage
            const newSnippet = {
                id: Date.now().toString(),
                name: name,
                description: description,
                code: code,
                language: language,
                createdAt: new Date().toISOString()
            };
            
            savedSnippets.push(newSnippet);
            localStorage.setItem('savedCodeSnippets', JSON.stringify(savedSnippets));
            
            showSnackbar('Đã lưu đoạn code thành công', 'success');
            
            // Cập nhật UI Saved Snippets nếu có
            if (document.querySelector('.saved-code-section')) {
                updateSavedSnippetsUI();
            } else {
                // Tạo UI nếu chưa có
                createSavedSnippetsUI();
            }
            
            closeDialog();
        });
    }
    
    // Hàm hiển thị code preview
    function showCodePreview(code, language) {
        // Tạo modal
        const previewModal = document.createElement('div');
        previewModal.className = 'code-preview-modal';
        previewModal.innerHTML = `
            <div class="code-preview-content">
                <div class="code-preview-header">
                    <div class="code-preview-title">
                        Xem chi tiết đoạn code 
                        <span class="code-preview-language">${language}</span>
                    </div>
                    <div class="code-preview-actions">
                        <button class="code-preview-action copy">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            Sao chép
                        </button>
                        <button class="code-preview-action download">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Tải xuống
                        </button>
                    </div>
                    <button class="code-preview-close">&times;</button>
                </div>
                <div class="code-preview-body">
                    <textarea class="code-preview-editor" spellcheck="false">${code}</textarea>
                </div>
            </div>
        `;
        
        // Thêm vào body
        document.body.appendChild(previewModal);
        
        // Hiển thị modal
        setTimeout(() => {
            previewModal.classList.add('show');
        }, 10);
        
        // Xử lý đóng modal
        const closeModal = () => {
            previewModal.classList.remove('show');
            setTimeout(() => {
                previewModal.remove();
            }, 300);
        };
        
        // Xử lý sự kiện nút đóng
        previewModal.querySelector('.code-preview-close').addEventListener('click', closeModal);
        
        // Xử lý click bên ngoài modal
        previewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // Xử lý nút sao chép
        previewModal.querySelector('.code-preview-action.copy').addEventListener('click', function() {
            createRippleEffect(this);
            const codeText = previewModal.querySelector('.code-preview-editor').value;
            navigator.clipboard.writeText(codeText).then(() => {
                showSnackbar('Đã sao chép code vào clipboard', 'success');
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Đã sao chép
                `;
                setTimeout(() => {
                    this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Sao chép
                    `;
                }, 2000);
            });
        });
        
        // Xử lý nút tải xuống
        previewModal.querySelector('.code-preview-action.download').addEventListener('click', function() {
            createRippleEffect(this);
            const codeText = previewModal.querySelector('.code-preview-editor').value;
            const blob = new Blob([codeText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `code-snippet.${getFileExtension(language)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showSnackbar('Đã tải xuống đoạn code', 'success');
        });
    }
    
    // Hàm lấy extension file từ language
    function getFileExtension(language) {
        const extensions = {
            'javascript': 'js',
            'python': 'py',
            'java': 'java',
            'csharp': 'cs',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php',
            'ruby': 'rb',
            'go': 'go',
            'rust': 'rs',
            'swift': 'swift',
            'kotlin': 'kt',
            'typescript': 'ts',
            'html': 'html',
            'css': 'css',
            'sql': 'sql',
            'bash': 'sh',
            'powershell': 'ps1',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yml',
            'markdown': 'md'
        };
        
        return extensions[language] || 'txt';
    }
    
    // Hàm tạo UI Saved Snippets
    function createSavedSnippetsUI() {
        // Kiểm tra nếu đã có section
        if (document.querySelector('.saved-code-section')) {
            return updateSavedSnippetsUI();
        }
        
        // Tạo section lưu code
        const savedSection = document.createElement('div');
        savedSection.className = 'saved-code-section';
        savedSection.innerHTML = `
            <div class="saved-code-title">
                <span>Đoạn code đã lưu</span>
                <button class="collapse-saved-code">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>
            </div>
            <div class="saved-code-list"></div>
        `;
        
        // Thêm vào document
        const container = document.querySelector('.chat-container');
        if (container) {
            container.appendChild(savedSection);
        }
        
        // Cập nhật danh sách
        updateSavedSnippetsUI();
        
        // Xử lý sự kiện đóng/mở
        savedSection.querySelector('.collapse-saved-code').addEventListener('click', function() {
            const codeList = savedSection.querySelector('.saved-code-list');
            const isCollapsed = codeList.style.display === 'none';
            
            if (isCollapsed) {
                codeList.style.display = 'flex';
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                `;
            } else {
                codeList.style.display = 'none';
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                `;
            }
        });
    }
    
    // Hàm cập nhật UI Saved Snippets
    function updateSavedSnippetsUI() {
        const codeList = document.querySelector('.saved-code-list');
        if (!codeList) return;
        
        // Clear hiện tại
        codeList.innerHTML = '';
        
        if (savedSnippets.length === 0) {
            codeList.innerHTML = '<div class="no-saved-code">Bạn chưa lưu đoạn code nào</div>';
            return;
        }
        
        // Thêm các snippet đã lưu
        savedSnippets.forEach(snippet => {
            const snippetItem = document.createElement('div');
            snippetItem.className = 'saved-code-item';
            snippetItem.innerHTML = `
                <div class="saved-code-name" title="${snippet.description || ''}">${snippet.name}</div>
                <div class="saved-code-language">${snippet.language}</div>
                <div class="saved-code-actions">
                    <button class="saved-code-action view-code" data-id="${snippet.id}" title="Xem">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="saved-code-action insert-code" data-id="${snippet.id}" title="Chèn vào chat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="saved-code-action delete-code" data-id="${snippet.id}" title="Xóa">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            codeList.appendChild(snippetItem);
        });
        
        // Xử lý sự kiện cho các nút
        codeList.querySelectorAll('.view-code').forEach(btn => {
            btn.addEventListener('click', function() {
                createRippleEffect(this);
                const id = this.getAttribute('data-id');
                const snippet = savedSnippets.find(s => s.id === id);
                if (snippet) {
                    showCodePreview(snippet.code, snippet.language);
                }
            });
        });
        
        codeList.querySelectorAll('.insert-code').forEach(btn => {
            btn.addEventListener('click', function() {
                createRippleEffect(this);
                const id = this.getAttribute('data-id');
                const snippet = savedSnippets.find(s => s.id === id);
                if (snippet) {
                    // Chèn vào input
                    messageInput.value += `\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n`;
                    messageInput.focus();
                    // Tự động adjust height
                    messageInput.style.height = 'auto';
                    messageInput.style.height = (messageInput.scrollHeight > 150 ? 150 : messageInput.scrollHeight) + 'px';
                    // Scroll xuống cuối textarea
                    messageInput.scrollTop = messageInput.scrollHeight;
                    
                    showSnackbar('Đã chèn code vào ô chat', 'success');
                }
            });
        });
        
        codeList.querySelectorAll('.delete-code').forEach(btn => {
            btn.addEventListener('click', function() {
                createRippleEffect(this);
                const id = this.getAttribute('data-id');
                
                // Tạo modal xác nhận
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Xác nhận xóa</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Bạn có chắc muốn xóa đoạn code này?</p>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-button modal-cancel">Hủy</button>
                            <button class="modal-button modal-confirm">Xóa</button>
                        </div>
                    </div>
                `;
                
                // Thêm vào body
                document.body.appendChild(modal);
                
                // Hiển thị modal
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
                
                // Xử lý đóng modal
                const closeModal = () => {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        modal.remove();
                    }, 300);
                };
                
                // Xử lý các nút
                modal.querySelector('.modal-close').addEventListener('click', closeModal);
                modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
                modal.querySelector('.modal-confirm').addEventListener('click', () => {
                    // Xóa snippet
                    savedSnippets = savedSnippets.filter(s => s.id !== id);
                    localStorage.setItem('savedCodeSnippets', JSON.stringify(savedSnippets));
                    
                    // Cập nhật UI
                    updateSavedSnippetsUI();
                    
                    // Thông báo
                    showSnackbar('Đã xóa đoạn code', 'success');
                    
                    closeModal();
                });
                
                // Đóng khi click ngoài
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            });
        });
    }
    
    // Hàm tạo hiệu ứng ripple cho button
    function createRippleEffect(element) {
        const button = element;
        
        // Tạo ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        // Vị trí giữa button
        const rect = button.getBoundingClientRect();
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        
        button.appendChild(ripple);
        
        // Xóa sau khi animation hoàn tất
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // Khởi tạo giao diện
    function initializeUI() {
        // Cấu trúc chat container
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            // Cấu trúc mới với sidebar
            chatContainer.innerHTML = `
                <div class="chat-sidebar">
                    <div class="new-chat-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Cuộc trò chuyện mới
                    </div>
                    <div class="conversations-list">
                        <div class="conversation-item active">
                            <div class="conversation-title">Trò chuyện hiện tại</div>
                            <div class="conversation-preview">Bắt đầu hỏi về lập trình</div>
                            <div class="conversation-time">Bây giờ</div>
                        </div>
                    </div>
                    <button class="toggle-sidebar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="chat-main">
                    <div class="chat-header">
                        <div class="chat-title">Code Supporter Chat</div>
                        <div class="chat-actions">
                            <button class="action-button" id="toggle-sidebar-btn" title="Toggle sidebar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                            </button>
                            <button class="action-button" id="clear-chat-btn" title="Clear chat">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="messages" class="messages"></div>
                    <div class="input-container">
                        <div class="input-actions">
                            <button class="input-action" id="code-btn" title="Insert code block">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="16 18 22 12 16 6"></polyline>
                                    <polyline points="8 6 2 12 8 18"></polyline>
                                </svg>
                            </button>
                        </div>
                        <textarea id="message-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
                        <button id="send-button" aria-label="Send message">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Reset references sau khi thay đổi DOM
            messagesContainer = document.getElementById('messages');
            messageInput = document.getElementById('message-input');
            sendButton = document.getElementById('send-button');
            
            // Xử lý insert code block
            document.getElementById('code-btn').addEventListener('click', function() {
                createRippleEffect(this);
                const codeTemplate = '```language\n// Your code here\n```';
                
                // Chèn vào vị trí con trỏ hoặc cuối
                const startPos = messageInput.selectionStart;
                const endPos = messageInput.selectionEnd;
                messageInput.value = messageInput.value.substring(0, startPos) + 
                                  codeTemplate + 
                                  messageInput.value.substring(endPos);
                
                // Đặt con trỏ vào giữa template
                const cursorPos = startPos + codeTemplate.indexOf('language');
                messageInput.focus();
                messageInput.setSelectionRange(cursorPos, cursorPos + 8);
                
                // Cập nhật chiều cao
                messageInput.style.height = 'auto';
                messageInput.style.height = (messageInput.scrollHeight > 150 ? 150 : messageInput.scrollHeight) + 'px';
            });
            
            // Xử lý toggle sidebar
            document.getElementById('toggle-sidebar-btn').addEventListener('click', function() {
                createRippleEffect(this);
                const sidebar = document.querySelector('.chat-sidebar');
                sidebar.classList.toggle('show');
            });
            
            // Xử lý nút toggle trong sidebar
            document.querySelector('.toggle-sidebar').addEventListener('click', function() {
                createRippleEffect(this);
                const sidebar = document.querySelector('.chat-sidebar');
                sidebar.classList.toggle('show');
            });
            
            // Xử lý nút clear chat
            document.getElementById('clear-chat-btn').addEventListener('click', function() {
                createRippleEffect(this);
                
                // Tạo modal xác nhận
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 class="modal-title">Xác nhận xóa</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Bạn có chắc muốn xóa tất cả tin nhắn trong cuộc trò chuyện này?</p>
                        </div>
                        <div class="modal-footer">
                            <button class="modal-button modal-cancel">Hủy</button>
                            <button class="modal-button modal-confirm">Xóa</button>
                        </div>
                    </div>
                `;
                
                // Thêm vào body
                document.body.appendChild(modal);
                
                // Hiển thị modal
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
                
                // Xử lý đóng modal
                const closeModal = () => {
                    modal.classList.remove('show');
                    setTimeout(() => {
                        modal.remove();
                    }, 300);
                };
                
                // Xử lý các nút
                modal.querySelector('.modal-close').addEventListener('click', closeModal);
                modal.querySelector('.modal-cancel').addEventListener('click', closeModal);
                modal.querySelector('.modal-confirm').addEventListener('click', () => {
                    // Xóa tất cả tin nhắn
                    messagesContainer.innerHTML = '';
                    
                    // Thêm tin nhắn chào mừng mới
                    addMessage('Cuộc trò chuyện đã được làm mới. Bạn cần hỗ trợ gì về lập trình?', 'bot', 
                        ['Hướng dẫn sử dụng', 'Tạo một ứng dụng web đơn giản', 'Học Python cơ bản']
                    );
                    
                    closeModal();
                    showSnackbar('Đã xóa tất cả tin nhắn', 'success');
                });
                
                // Đóng khi click ngoài
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            });
            
            // Xử lý nút new chat
            document.querySelector('.new-chat-button').addEventListener('click', function() {
                createRippleEffect(this);
                
                // Xóa tất cả tin nhắn
                messagesContainer.innerHTML = '';
                
                // Thêm tin nhắn chào mừng mới
                addMessage('Bắt đầu cuộc trò chuyện mới. Bạn cần hỗ trợ gì về lập trình?', 'bot', 
                    ['Hướng dẫn sử dụng', 'Tạo một ứng dụng web đơn giản', 'Học Python cơ bản']
                );
                
                // Cập nhật sidebar
                const now = new Date();
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                
                const newConversationItem = document.createElement('div');
                newConversationItem.className = 'conversation-item active';
                newConversationItem.innerHTML = `
                    <div class="conversation-title">Cuộc trò chuyện mới</div>
                    <div class="conversation-preview">Bắt đầu hỏi về lập trình</div>
                    <div class="conversation-time">${hours}:${minutes}</div>
                `;
                
                // Thêm vào đầu danh sách
                const conversationsList = document.querySelector('.conversations-list');
                conversationsList.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
                conversationsList.prepend(newConversationItem);
                
                showSnackbar('Đã tạo cuộc trò chuyện mới', 'success');
            });
        }
        
        // Tạo UI Saved Snippets
        createSavedSnippetsUI();
        
        // CSS thêm cho modal và các component
        const additionalCSS = document.createElement('style');
        additionalCSS.textContent = `
            /* Ripple effect */
            .ripple-effect {
                position: absolute;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.3);
                width: 100px;
                height: 100px;
                margin-top: -50px;
                margin-left: -50px;
                animation: ripple 0.6s linear;
                pointer-events: none;
                transform: scale(0);
            }
            
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            /* Snackbar */
            .snackbar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100%);
                min-width: 250px;
                background-color: var(--card-bg);
                color: var(--text-color);
                border-radius: 8px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 9999;
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            
            .snackbar.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            .snackbar-success {
                border-left: 4px solid var(--success-color);
            }
            
            .snackbar-error {
                border-left: 4px solid var(--error-color);
            }
            
            .snackbar-info {
                border-left: 4px solid var(--primary-color);
            }
            
            /* Modal */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-content {
                width: 400px;
                max-width: 90%;
                background-color: var(--card-bg);
                border-radius: 12px;
                overflow: hidden;
                transform: scale(0.9);
                transition: transform 0.3s ease;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            }
            
            .modal-overlay.show .modal-content {
                transform: scale(1);
            }
            
            .modal-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-title {
                font-weight: 600;
                font-size: 18px;
            }
            
            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                line-height: 24px;
                color: var(--text-muted);
                cursor: pointer;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .modal-footer {
                padding: 16px 20px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            .modal-button {
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                border: none;
            }
            
            .modal-cancel {
                background-color: var(--input-bg);
                color: var(--text-color);
            }
            
            .modal-confirm {
                background-color: var(--error-color);
                color: white;
            }
            
            /* Conversation styles */
            .chat-container {
                display: grid;
                grid-template-columns: 280px 1fr;
                height: calc(100vh - 70px);
            }
            
            @media (max-width: 768px) {
                .chat-container {
                    grid-template-columns: 1fr;
                }
                
                .chat-sidebar {
                    display: none;
                    position: fixed;
                    top: 70px;
                    left: 0;
                    bottom: 0;
                    width: 280px;
                    z-index: 100;
                }
                
                .chat-sidebar.show {
                    display: block;
                }
            }
        `;
        document.head.appendChild(additionalCSS);
        
        // Đặt focus vào input khi trang được tải
        setTimeout(() => {
            messageInput.focus();
        }, 500);
        
        // Tạo tin nhắn chào mừng
        addMessage('Xin chào! Tôi là trợ lý Code Supporter. Bạn cần giúp đỡ gì về lập trình?', 'bot', 
            ['Hướng dẫn sử dụng', 'Tạo một ứng dụng web đơn giản', 'Học Python cơ bản']
        );
    }
});