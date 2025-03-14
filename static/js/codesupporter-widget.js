/**
 * Code Supporter Widget - JavaScript cho tích hợp vào trang web
 * Cập nhật: Thêm tính năng theo dõi người dùng qua user_id
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
          --cs-primary-color: #3a86ff;
          --cs-text-color: ${isDark ? '#ffffff' : '#333333'};
          --cs-bg-color: ${isDark ? '#1e1e1e' : '#ffffff'};
          --cs-secondary-bg: ${isDark ? '#333333' : '#f0f0f0'};
          --cs-border-color: ${isDark ? '#555555' : '#dddddd'};
          --cs-accent-color: #4CAF50;
          
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
          background-color: var(--cs-primary-color);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s, background-color 0.3s;
        }
        
        .cs-chat-button:hover {
          transform: scale(1.1);
          background-color: #2563eb;
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
          border-radius: 10px;
          box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: opacity 0.3s, transform 0.3s;
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
        
        .cs-chat-header {
          padding: 15px;
          background-color: var(--cs-primary-color);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .cs-chat-title {
          font-weight: bold;
          font-size: 16px;
        }
        
        .cs-close-button {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        
        .cs-messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .cs-message {
          max-width: 85%;
          padding: 10px 15px;
          border-radius: 15px;
          word-wrap: break-word;
          line-height: 1.5;
        }
        
        .cs-bot-message {
          align-self: flex-start;
          background-color: var(--cs-secondary-bg);
        }
        
        .cs-user-message {
          align-self: flex-end;
          background-color: var(--cs-primary-color);
          color: white;
        }
        
        .cs-input-container {
          padding: 10px;
          display: flex;
          gap: 10px;
          border-top: 1px solid var(--cs-border-color);
        }
        
        .cs-input {
          flex: 1;
          padding: 10px 15px;
          border-radius: 20px;
          border: 1px solid var(--cs-border-color);
          background-color: var(--cs-secondary-bg);
          color: var(--cs-text-color);
          outline: none;
          resize: none;
          min-height: 40px;
          max-height: 100px;
          overflow-y: auto;
        }
        
        .cs-send-button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: var(--cs-primary-color);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          border: none;
        }
        
        .cs-send-button:hover {
          background-color: #2563eb;
        }
        
        .cs-send-button:disabled {
          background-color: var(--cs-border-color);
          cursor: not-allowed;
        }
        
        .cs-typing-indicator {
          align-self: flex-start;
          background-color: var(--cs-secondary-bg);
          padding: 10px 15px;
          border-radius: 15px;
          margin-bottom: 10px;
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .cs-typing-dot {
          width: 8px;
          height: 8px;
          background-color: var(--cs-border-color);
          border-radius: 50%;
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
          padding: 10px;
          border-radius: 5px;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          overflow-x: auto;
          margin: 5px 0;
          white-space: pre-wrap;
          border: 1px solid var(--cs-border-color);
        }
        
        .cs-copy-button {
          position: absolute;
          top: 5px;
          right: 5px;
          background-color: var(--cs-primary-color);
          color: white;
          border: none;
          border-radius: 3px;
          padding: 2px 5px;
          font-size: 12px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .cs-code-container:hover .cs-copy-button {
          opacity: 1;
        }
        
        .cs-code-container {
          position: relative;
        }
        
        .cs-branding {
          font-size: 11px;
          text-align: center;
          padding: 5px;
          opacity: 0.7;
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
      
      const title = document.createElement('div');
      title.className = 'cs-chat-title';
      title.textContent = this.config.chatTitle;
      header.appendChild(title);
      
      const closeButton = document.createElement('button');
      closeButton.className = 'cs-close-button';
      closeButton.innerHTML = '&times;';
      closeButton.setAttribute('aria-label', 'Đóng cửa sổ chat');
      header.appendChild(closeButton);
      
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
      this.sendButton.innerHTML = '&#10148;';
      this.sendButton.setAttribute('aria-label', 'Gửi tin nhắn');
      inputContainer.appendChild(this.sendButton);
      
      this.chatWindow.appendChild(inputContainer);
      
      // Thêm branding
      const branding = document.createElement('div');
      branding.className = 'cs-branding';
      branding.textContent = 'Powered by Code Supporter';
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
        this.inputField.style.height = (this.inputField.scrollHeight > 100 ? 100 : this.inputField.scrollHeight) + 'px';
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
      
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      return await response.json();
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