/**
 * Code Supporter Widget - JavaScript cho tích hợp vào trang web
 * Cập nhật: Thêm tính năng phóng to/thu nhỏ và cải tiến giao diện
 */
(function() {
  // Hàm tạo widget
  class CodeSupporterWidget {
    constructor(options = {}) {
      // Cấu hình mặc định
      this.config = {
        apiUrl: options.apiUrl || 'http://localhost:5000/api/chat/public',
        apiKey: options.apiKey || '',
        position: options.position || 'bottom-right',
        theme: options.theme || 'dark',
        chatTitle: options.chatTitle || 'Code Supporter',
        initialMessage: options.initialMessage || 'Chào bạn! Mình có thể giúp gì cho bạn về lập trình?',
        maxHeight: options.maxHeight || '500px',
        width: options.width || '350px',
        showOnInit: options.showOnInit || false,
        sessionId: options.sessionId || `session-${Date.now()}`,
        userId: options.userId || null,  // ID của người dùng từ hệ thống của bạn
        userInfo: options.userInfo || null  // Thông tin bổ sung về người dùng
      };
      
      this.conversationHistory = [];
      this.isMaximized = false;
      
      // Khởi tạo widget
      this.init();
    }
    
    init() {
      // Tạo và chèn CSS
      this.injectStyles();
      
      // Tạo cấu trúc HTML
      this.createMarkup();
      
      // Thêm các sự kiện
      this.setupEventListeners();
      
      // Hiển thị tin nhắn chào mừng
      if (this.config.initialMessage) {
        this.addMessage(this.config.initialMessage, 'bot');
      }
      
      // Hiển thị widget nếu được cấu hình
      if (this.config.showOnInit) {
        this.toggleChatWindow(true);
      }
      
      // Tạo user_id ngẫu nhiên nếu không được cung cấp
      if (!this.config.userId) {
        this.config.userId = `anonymous-${this.config.sessionId}`;
      }
    }
    
    injectStyles() {
      const isDark = this.config.theme === 'dark';
      
      const css = `
        .cs-widget-container {
          --cs-primary-color: #4361ee;
          --cs-primary-gradient: linear-gradient(135deg, #4361ee, #3a0ca3);
          --cs-text-color: ${isDark ? '#ffffff' : '#333333'};
          --cs-bg-color: ${isDark ? '#1e1e1e' : '#ffffff'};
          --cs-secondary-bg: ${isDark ? '#2d2d2d' : '#f5f5f5'};
          --cs-border-color: ${isDark ? '#555555' : '#dddddd'};
          --cs-accent-color: #4CC9F0;
          
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: var(--cs-text-color);
        }
      
        .cs-widget-container * {
          box-sizing: border-box;
        }
        
        .cs-widget-container {
          position: fixed;
          ${this.config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
          ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          z-index: 99999;
        }
        
        .cs-chat-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--cs-primary-gradient);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .cs-chat-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(67, 97, 238, 0.4);
        }
        
        .cs-chat-icon {
          font-size: 28px;
          transition: transform 0.3s;
        }
        
        .cs-chat-window {
          position: absolute;
          ${this.config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
          ${this.config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
          width: ${this.config.width};
          height: ${this.config.maxHeight};
          max-height: calc(100vh - 150px);
          background-color: var(--cs-bg-color);
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
          opacity: 0;
          transform: scale(0.9);
          transform-origin: ${this.config.position.includes('right') ? 'bottom right' : 'bottom left'};
          pointer-events: none;
        }
        
        .cs-chat-window.active {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }
        
        .cs-chat-window.maximized {
          position: fixed;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          width: calc(100% - 20px) !important;
          height: calc(100% - 20px) !important;
          max-height: none !important;
          border-radius: 16px;
          z-index: 9999;
        }
        
        .cs-chat-header {
          padding: 15px;
          background: var(--cs-primary-gradient);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .cs-chat-title-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cs-chat-logo {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: white;
          border-radius: 50%;
          color: var(--cs-primary-color);
          font-weight: bold;
          font-size: 14px;
        }
        
        .cs-chat-title {
          font-weight: bold;
          font-size: 16px;
        }
        
        .cs-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cs-header-button {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 14px;
          border-radius: 6px;
          width: 30px;
          height: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .cs-header-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .cs-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }
        
        .cs-message {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 18px;
          word-wrap: break-word;
          line-height: 1.5;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
          animation: messageAppear 0.3s ease forwards;
        }
        
        @keyframes messageAppear {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .cs-message:hover {
          transform: translateY(-2px);
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
        }
        
        .cs-bot-message {
          align-self: flex-start;
          background-color: var(--cs-secondary-bg);
          border-bottom-left-radius: 6px;
        }
        
        .cs-user-message {
          align-self: flex-end;
          background: var(--cs-primary-gradient);
          color: white;
          border-bottom-right-radius: 6px;
        }
        
        .cs-input-container {
          padding: 12px 16px;
          display: flex;
          gap: 10px;
          border-top: 1px solid var(--cs-border-color);
          background-color: var(--cs-bg-color);
        }
        
        .cs-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 24px;
          border: 1px solid var(--cs-border-color);
          background-color: var(--cs-secondary-bg);
          color: var(--cs-text-color);
          outline: none;
          resize: none;
          min-height: 48px;
          max-height: 120px;
          overflow-y: auto;
          transition: border-color 0.3s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        
        .cs-input:focus {
          border-color: var(--cs-primary-color);
          box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2);
        }
        
        .cs-send-button {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--cs-primary-gradient);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(67, 97, 238, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .cs-send-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(67, 97, 238, 0.4);
        }
        
        .cs-send-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        
        .cs-typing-indicator {
          align-self: flex-start;
          background-color: var(--cs-secondary-bg);
          padding: 12px 16px;
          border-radius: 18px;
          border-bottom-left-radius: 6px;
          margin-bottom: 10px;
          display: flex;
          gap: 4px;
          align-items: center;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .cs-typing-dot {
          width: 8px;
          height: 8px;
          background-color: var(--cs-primary-color);
          border-radius: 50%;
          opacity: 0.7;
          animation: cs-typing-animation 1.5s infinite ease-in-out;
        }
        
        .cs-typing-dot:nth-child(1) { animation-delay: 0s; }
        .cs-typing-dot:nth-child(2) { animation-delay: 0.3s; }
        .cs-typing-dot:nth-child(3) { animation-delay: 0.6s; }
        
        @keyframes cs-typing-animation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .cs-code-block {
          background-color: ${isDark ? '#1a1a1a' : '#f8f8f8'};
          padding: 14px;
          border-radius: 8px;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          overflow-x: auto;
          margin: 8px 0;
          white-space: pre-wrap;
          border: 1px solid var(--cs-border-color);
          font-size: 13px;
          line-height: 1.6;
        }
        
        .cs-copy-button {
          position: absolute;
          top: 5px;
          right: 5px;
          background-color: var(--cs-primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
        }
        
        .cs-copy-button:hover {
          background-color: #3a0ca3;
        }
        
        .cs-code-container:hover .cs-copy-button {
          opacity: 1;
        }
        
        .cs-code-container {
          position: relative;
        }
        
        .cs-branding {
          font-size: 12px;
          text-align: center;
          padding: 8px;
          opacity: 0.8;
          background-color: var(--cs-bg-color);
          border-top: 1px solid var(--cs-border-color);
        }
        
        @media (max-width: 768px) {
          .cs-widget-container {
            ${this.config.position.includes('bottom') ? 'bottom: 10px;' : 'top: 10px;'}
            ${this.config.position.includes('right') ? 'right: 10px;' : 'left: 10px;'}
          }
          
          .cs-chat-window {
            width: calc(100vw - 20px);
            ${this.config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
            left: 10px;
            right: 10px;
            max-width: none;
          }
        }
      `;
      
      const style = document.createElement('style');
      style.innerHTML = css;
      document.head.appendChild(style);
    }
    
    createMarkup() {
      // Tạo container
      this.container = document.createElement('div');
      this.container.className = 'cs-widget-container';
      
      // Tạo nút chat
      this.chatButton = document.createElement('div');
      this.chatButton.className = 'cs-chat-button';
      this.chatButton.innerHTML = '<span class="cs-chat-icon">💬</span>';
      this.container.appendChild(this.chatButton);
      
      // Tạo cửa sổ chat
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'cs-chat-window';
      
      // Header
      const header = document.createElement('div');
      header.className = 'cs-chat-header';
      
      // Title container với logo
      const titleContainer = document.createElement('div');
      titleContainer.className = 'cs-chat-title-container';
      
      const logo = document.createElement('div');
      logo.className = 'cs-chat-logo';
      logo.textContent = 'CS';
      titleContainer.appendChild(logo);
      
      const title = document.createElement('div');
      title.className = 'cs-chat-title';
      title.textContent = this.config.chatTitle;
      titleContainer.appendChild(title);
      
      header.appendChild(titleContainer);
      
      // Header actions
      const headerActions = document.createElement('div');
      headerActions.className = 'cs-header-actions';
      
      // Nút phóng to/thu nhỏ
      const maximizeButton = document.createElement('button');
      maximizeButton.className = 'cs-header-button cs-maximize-button';
      maximizeButton.innerHTML = '⛶';
      maximizeButton.setAttribute('aria-label', 'Phóng to/Thu nhỏ');
      maximizeButton.setAttribute('title', 'Phóng to/Thu nhỏ');
      headerActions.appendChild(maximizeButton);
      
      // Nút đóng
      const closeButton = document.createElement('button');
      closeButton.className = 'cs-header-button cs-close-button';
      closeButton.innerHTML = '✕';
      closeButton.setAttribute('aria-label', 'Đóng cửa sổ chat');
      closeButton.setAttribute('title', 'Đóng');
      headerActions.appendChild(closeButton);
      
      header.appendChild(headerActions);
      this.chatWindow.appendChild(header);
      
      // Vùng tin nhắn
      this.messagesContainer = document.createElement('div');
      this.messagesContainer.className = 'cs-messages-container';
      this.chatWindow.appendChild(this.messagesContainer);
      
      // Vùng nhập tin nhắn
      const inputContainer = document.createElement('div');
      inputContainer.className = 'cs-input-container';
      
      this.inputField = document.createElement('textarea');
      this.inputField.className = 'cs-input';
      this.inputField.placeholder = 'Nhập tin nhắn...';
      this.inputField.setAttribute('rows', '1');
      inputContainer.appendChild(this.inputField);
      
      this.sendButton = document.createElement('button');
      this.sendButton.className = 'cs-send-button';
      this.sendButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      this.sendButton.setAttribute('aria-label', 'Gửi tin nhắn');
      inputContainer.appendChild(this.sendButton);
      
      this.chatWindow.appendChild(inputContainer);
      
      // Thêm branding
      const branding = document.createElement('div');
      branding.className = 'cs-branding';
      branding.innerHTML = 'Powered by <strong>Code Supporter</strong>';
      this.chatWindow.appendChild(branding);
      
      // Thêm vào container
      this.container.appendChild(this.chatWindow);
      
      // Thêm vào trang
      document.body.appendChild(this.container);
    }
    
    setupEventListeners() {
      // Mở/đóng cửa sổ chat
      this.chatButton.addEventListener('click', () => {
        this.toggleChatWindow(true);
      });
      
      this.chatWindow.querySelector('.cs-close-button').addEventListener('click', () => {
        this.toggleChatWindow(false);
      });
      
      // Xử lý phóng to/thu nhỏ
      const maximizeButton = this.chatWindow.querySelector('.cs-maximize-button');
      maximizeButton.addEventListener('click', () => {
        this.toggleMaximize();
      });
      
      // Gửi tin nhắn
      this.sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
      
      // Gửi tin nhắn khi nhấn Enter (không phải Shift+Enter)
      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Tự động điều chỉnh chiều cao textarea
      this.inputField.addEventListener('input', () => {
        this.inputField.style.height = 'auto';
        this.inputField.style.height = (this.inputField.scrollHeight > 120 ? 120 : this.inputField.scrollHeight) + 'px';
      });
    }
    
    toggleChatWindow(show) {
      if (show) {
        this.chatWindow.classList.add('active');
        this.inputField.focus();
      } else {
        this.chatWindow.classList.remove('active');
      }
    }
    
    toggleMaximize() {
      this.isMaximized = !this.isMaximized;
      this.chatWindow.classList.toggle('maximized', this.isMaximized);
      
      // Thay đổi icon tùy theo trạng thái
      const maximizeButton = this.chatWindow.querySelector('.cs-maximize-button');
      if (this.isMaximized) {
        maximizeButton.innerHTML = '⛶';
        maximizeButton.setAttribute('title', 'Thu nhỏ');
      } else {
        maximizeButton.innerHTML = '⛶';
        maximizeButton.setAttribute('title', 'Phóng to');
      }
      
      // Cuộn xuống cuối tin nhắn
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    sendMessage() {
      const message = this.inputField.value.trim();
      if (!message) return;
      
      // Hiển thị tin nhắn người dùng
      this.addMessage(message, 'user');
      
      // Xóa nội dung input
      this.inputField.value = '';
      this.inputField.style.height = 'auto';
      
      // Hiển thị typing indicator
      const typingIndicator = this.showTypingIndicator();
      
      // Vô hiệu hóa nút gửi
      this.sendButton.disabled = true;
      
      // Gửi tin nhắn đến API
      this.callChatAPI(message)
        .then(response => {
          // Xóa typing indicator
          typingIndicator.remove();
          
          // Hiển thị phản hồi
          if (response && response.reply) {
            this.addMessage(response.reply, 'bot');
          } else {
            this.addMessage('Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.', 'bot');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          typingIndicator.remove();
          this.addMessage('Đã xảy ra lỗi khi kết nối với server.', 'bot');
        })
        .finally(() => {
          // Kích hoạt lại nút gửi
          this.sendButton.disabled = false;
        });
    }
    
    addMessage(text, sender) {
      const message = document.createElement('div');
      message.className = `cs-message cs-${sender}-message`;
      
      // Xử lý markdown cơ bản và code blocks
      const formattedText = this.formatMessage(text);
      message.innerHTML = formattedText;
      
      // Thêm nút copy cho code blocks
      message.querySelectorAll('.cs-code-container').forEach(container => {
        const codeBlock = container.querySelector('code');
        const copyButton = document.createElement('button');
        copyButton.className = 'cs-copy-button';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(codeBlock.textContent)
            .then(() => {
              copyButton.textContent = 'Copied!';
              setTimeout(() => {
                copyButton.textContent = 'Copy';
              }, 2000);
            });
        });
        container.appendChild(copyButton);
      });
      
      // Thêm vào container
      this.messagesContainer.appendChild(message);
      
      // Cuộn xuống cuối
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      
      // Thêm vào lịch sử
      this.conversationHistory.push({
        role: sender === 'user' ? 'user' : 'assistant',
        content: text
      });
    }
    
    formatMessage(text) {
      // Xử lý code blocks ```code```
      let formatted = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<div class="cs-code-container"><pre class="cs-code-block"><code>${this.escapeHTML(code)}</code></pre></div>`;
      });
      
      // Xử lý inline code `code`
      formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      // Xử lý bold **text**
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Xử lý italic *text*
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Xử lý xuống dòng
      formatted = formatted.replace(/\n/g, '<br>');
      
      return formatted;
    }
    
    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    showTypingIndicator() {
      const indicator = document.createElement('div');
      indicator.className = 'cs-typing-indicator';
      indicator.innerHTML = `
        <div class="cs-typing-dot"></div>
        <div class="cs-typing-dot"></div>
        <div class="cs-typing-dot"></div>
      `;
      this.messagesContainer.appendChild(indicator);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      return indicator;
    }
    
    async callChatAPI(message) {
      try {
          // Luôn đảm bảo sử dụng HTTPS cho URL API
          let apiUrl = this.config.apiUrl;
          if (apiUrl.startsWith('http:')) {
              apiUrl = apiUrl.replace('http:', 'https:');
          }
          
          console.log("Gửi request đến:", apiUrl);
          
          const headers = {
              'Content-Type': 'application/json'
          };
          
          // Thêm API key nếu có
          if (this.config.apiKey) {
              headers['X-API-Key'] = this.config.apiKey;
          }
          
          // Chuẩn bị dữ liệu gửi đi
          const requestData = {
              message: message,
              conversation_history: this.conversationHistory.slice(-10), // Gửi 10 tin nhắn gần nhất
              session_id: this.config.sessionId
          };
          
          // Thêm user_id và user_info nếu có
          if (this.config.userId) {
              requestData.user_id = this.config.userId;
          }
          
          if (this.config.userInfo) {
              requestData.user_info = this.config.userInfo;
          }
          
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(requestData),
              mode: 'cors', // Thêm mode: 'cors' để xử lý CORS đúng cách
              credentials: 'omit' // Không gửi cookie để tránh vấn đề CORS phức tạp
          });
          
          if (!response.ok) {
              console.error(`Lỗi API: ${response.status} - ${response.statusText}`);
              throw new Error(`API responded with status ${response.status}`);
          }
          
          return await response.json();
      } catch (error) {
          console.error("Error calling Chat API:", error);
          throw error; // Ném lỗi để xử lý ở nơi gọi hàm
      }
  }
    
    // Phương thức để thiết lập hoặc cập nhật userId
    setUserId(userId, userInfo = null) {
      this.config.userId = userId;
      if (userInfo) {
        this.config.userInfo = userInfo;
      }
    }
    
    // Phương thức để xóa lịch sử trò chuyện
    clearConversation() {
      this.conversationHistory = [];
      this.messagesContainer.innerHTML = '';
      
      // Thêm lại tin nhắn chào mừng
      if (this.config.initialMessage) {
        this.addMessage(this.config.initialMessage, 'bot');
      }
    }
  }
  
  // Thêm vào global scope
  window.CodeSupporterWidget = CodeSupporterWidget;
  
  // Hàm khởi tạo tiện ích
  window.initCodeSupporter = function(options) {
    return new CodeSupporterWidget(options);
  };
})();