// chat.js - Xử lý chức năng chat với hỗ trợ streaming và quản lý hội thoại
document.addEventListener('DOMContentLoaded', function() {
    // ===== Lấy các phần tử DOM =====
    // Khu vực tin nhắn
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatTitle = document.getElementById('chat-title');
    
    // Sidebar và danh sách hội thoại
    const chatSidebar = document.querySelector('.chat-sidebar');
    const conversationsList = document.getElementById('conversations-list');
    const newChatButton = document.getElementById('new-chat-button');
    const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
    const closeSidebarButton = document.getElementById('close-sidebar');
    
    // Buttons
    const themeToggle = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    const renameConversationButton = document.getElementById('rename-conversation');
    const deleteConversationButton = document.getElementById('delete-conversation');
    const clearAllConversationsButton = document.getElementById('clear-all-conversations');
    
    // Modals
    const renameModal = document.getElementById('rename-modal');
    const conversationNameInput = document.getElementById('conversation-name');
    const closeRenameModalButton = document.getElementById('close-rename-modal');
    const cancelRenameButton = document.getElementById('cancel-rename');
    const confirmRenameButton = document.getElementById('confirm-rename');
    
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModalButton = document.getElementById('close-delete-modal');
    const cancelDeleteButton = document.getElementById('cancel-delete');
    const confirmDeleteButton = document.getElementById('confirm-delete');
    
    const clearAllModal = document.getElementById('clear-all-modal');
    const closeClearAllModalButton = document.getElementById('close-clear-all-modal');
    const cancelClearAllButton = document.getElementById('cancel-clear-all');
    const confirmClearAllButton = document.getElementById('confirm-clear-all');
    
    // ===== Biến lưu trạng thái =====
    let currentConversationId = null; // ID của hội thoại hiện tại
    let conversations = []; // Danh sách hội thoại đã tải
    let isWaitingForResponse = false; // Đang chờ phản hồi từ API
    let currentStreamBuffer = ''; // Buffer cho stream
    let streamUpdateInterval = null; // Interval cho cập nhật stream
    
    // ===== Khởi tạo chương trình =====
    // Kiểm tra và áp dụng theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Tải danh sách hội thoại khi trang được load
    loadConversations();
    
    // Khởi tạo syntax highlighting
    initCodeHighlighting();
    
    // ===== Event Listeners =====
    // Toggle theme
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }
    
    // Đăng xuất
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/login';
        });
    }
    
    // Auto-resize cho textarea
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight > 120 ? 120 : this.scrollHeight) + 'px';
        });
        
        // Gửi tin nhắn khi nhấn Enter (không phải Shift+Enter)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Nút gửi tin nhắn
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Nút tạo hội thoại mới
    if (newChatButton) {
        newChatButton.addEventListener('click', createNewConversation);
    }
    
    // Toggle sidebar trên mobile
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', function() {
            chatSidebar.classList.add('show');
        });
    }
    
    // Đóng sidebar trên mobile
    if (closeSidebarButton) {
        closeSidebarButton.addEventListener('click', function() {
            chatSidebar.classList.remove('show');
        });
    }
    
    // Nút đổi tên hội thoại
    if (renameConversationButton) {
        renameConversationButton.addEventListener('click', function() {
            if (!currentConversationId) return;
            
            // Lấy tên hiện tại
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                conversationNameInput.value = conversation.title || '';
            }
            
            // Hiển thị modal
            renameModal.classList.add('show');
            setTimeout(() => {
                conversationNameInput.focus();
                conversationNameInput.select();
            }, 100);
        });
    }
    
    // Xử lý modal đổi tên
    if (closeRenameModalButton) closeRenameModalButton.addEventListener('click', () => renameModal.classList.remove('show'));
    if (cancelRenameButton) cancelRenameButton.addEventListener('click', () => renameModal.classList.remove('show'));
    if (confirmRenameButton) {
        confirmRenameButton.addEventListener('click', function() {
            const newName = conversationNameInput.value.trim();
            if (newName && currentConversationId) {
                renameConversation(currentConversationId, newName);
            }
            renameModal.classList.remove('show');
        });
    }
    
    // Nút xóa hội thoại
    if (deleteConversationButton) {
        deleteConversationButton.addEventListener('click', function() {
            if (!currentConversationId) return;
            deleteModal.classList.add('show');
        });
    }
    
    // Xử lý modal xóa
    if (closeDeleteModalButton) closeDeleteModalButton.addEventListener('click', () => deleteModal.classList.remove('show'));
    if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', () => deleteModal.classList.remove('show'));
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', function() {
            if (currentConversationId) {
                deleteConversation(currentConversationId);
            }
            deleteModal.classList.remove('show');
        });
    }
    
    // Nút xóa tất cả hội thoại
    if (clearAllConversationsButton) {
        clearAllConversationsButton.addEventListener('click', function() {
            clearAllModal.classList.add('show');
        });
    }
    
    // Xử lý modal xóa tất cả
    if (closeClearAllModalButton) closeClearAllModalButton.addEventListener('click', () => clearAllModal.classList.remove('show'));
    if (cancelClearAllButton) cancelClearAllButton.addEventListener('click', () => clearAllModal.classList.remove('show'));
    if (confirmClearAllButton) {
        confirmClearAllButton.addEventListener('click', function() {
            clearAllConversations();
            clearAllModal.classList.remove('show');
        });
    }
    
    // ===== Các hàm xử lý hội thoại =====
    // Tải danh sách hội thoại
    function loadConversations() {
        // Hiển thị loading state
        conversationsList.innerHTML = `
            <div class="loading-conversations">
                <div class="spinner"></div>
                <span>Đang tải hội thoại...</span>
            </div>
        `;
        
        // Gọi API để lấy danh sách hội thoại
        fetch('/api/conversations', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            conversations = data.conversations || [];
            
            // Hiển thị danh sách hội thoại
            renderConversationList();
            
            // Nếu có hội thoại, tải hội thoại đầu tiên
            if (conversations.length > 0) {
                loadConversation(conversations[0].id);
            } else {
                // Nếu không có hội thoại nào, hiển thị trang trống
                renderEmptyState();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Hiển thị thông báo lỗi
            conversationsList.innerHTML = `
                <div class="empty-conversations">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Không thể tải danh sách hội thoại. Vui lòng thử lại sau.</p>
                </div>
            `;
        });
    }
    
    // Hiển thị danh sách hội thoại
    function renderConversationList() {
        if (!conversationsList) return;
        
        if (conversations.length === 0) {
            // Hiển thị trạng thái trống
            conversationsList.innerHTML = `
                <div class="empty-conversations">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <p>Chưa có hội thoại nào. Hãy bắt đầu một hội thoại mới.</p>
                </div>
            `;
            return;
        }
        
        // Sắp xếp hội thoại theo thời gian cập nhật giảm dần
        const sortedConversations = [...conversations].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at);
            const dateB = new Date(b.updated_at || b.created_at);
            return dateB - dateA;
        });
        
        // Tạo HTML cho từng hội thoại
        let html = '';
        sortedConversations.forEach(conversation => {
            const isActive = conversation.id === currentConversationId;
            const title = conversation.title || 'Hội thoại không có tiêu đề';
            const hasPreview = conversation.preview && conversation.preview.trim() !== '';
            const preview = hasPreview ? conversation.preview : 'Không có tin nhắn';
            
            const date = new Date(conversation.updated_at || conversation.created_at);
            const timeString = formatDate(date);
            
            html += `
                <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conversation.id}">
                    <div class="conversation-title">${escapeHTML(title)}</div>
                    <div class="conversation-preview">${escapeHTML(preview)}</div>
                    <div class="conversation-time">${timeString}</div>
                    <div class="conversation-actions">
                        <button class="conversation-action" data-action="delete" data-id="${conversation.id}" title="Xóa hội thoại">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        });
        
        conversationsList.innerHTML = html;
        
        // Thêm event listeners cho các hội thoại
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Kiểm tra nếu click vào nút xóa thì không chuyển hội thoại
                if (e.target.closest('.conversation-action')) return;
                
                const conversationId = this.dataset.id;
                if (conversationId !== currentConversationId) {
                    loadConversation(conversationId);
                    
                    // Đóng sidebar trên mobile sau khi chọn hội thoại
                    if (window.innerWidth <= 768) {
                        chatSidebar.classList.remove('show');
                    }
                }
            });
        });
        
        // Thêm event listeners cho các nút action
        conversationsList.querySelectorAll('.conversation-action[data-action="delete"]').forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const conversationId = this.dataset.id;
                
                // Hiển thị dialog xác nhận xóa
                deleteModal.classList.add('show');
                
                // Cập nhật currentConversationId để biết conversation nào đang bị xóa
                currentConversationId = conversationId;
            });
        });
    }
    
    // Tải nội dung của một hội thoại
    function loadConversation(conversationId) {
        if (!conversationId) return;

        // Cập nhật UI để hiển thị hội thoại đã chọn
        updateActiveConversation(conversationId);
        
        // Clear messages và hiển thị loading
        messagesContainer.innerHTML = '';
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'typing-indicator';
        loadingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(loadingDiv);
        
        // Gọi API để lấy tin nhắn của hội thoại
        fetch(`/api/conversations/${conversationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            // Xóa loading indicator
            loadingDiv.remove();
            
            // Cập nhật tiêu đề
            const conversation = data.conversation || {};
            chatTitle.textContent = conversation.title || 'Hội thoại mới';
            
            // Hiển thị tin nhắn
            const messages = data.messages || [];
            messages.forEach(message => {
                addMessageToUI(message.content, message.role);
            });
            
            // Scroll xuống cuối
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Kích hoạt lại input
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Xóa loading indicator
            loadingDiv.remove();
            
            // Hiển thị thông báo lỗi
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message bot-message';
            errorDiv.innerHTML = `
                <div class="message-content">
                    <p>Không thể tải hội thoại. Vui lòng thử lại sau.</p>
                    <p>Lỗi: ${error.message}</p>
                </div>
            `;
            messagesContainer.appendChild(errorDiv);
        });
    }
    
    // Cập nhật UI để hiển thị hội thoại active
    function updateActiveConversation(conversationId) {
        currentConversationId = conversationId;
        
        // Cập nhật class active
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            if (item.dataset.id === conversationId) {
                item.classList.add('active');
                item.classList.remove('has-new'); // Xóa indicator tin nhắn mới
            } else {
                item.classList.remove('active');
            }
        });
        
        // Tìm và hiển thị tiêu đề hội thoại
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            chatTitle.textContent = conversation.title || 'Hội thoại mới';
        }
    }
    
    // Tạo hội thoại mới
    function createNewConversation() {
        // Cập nhật UI
        currentConversationId = null;
        chatTitle.textContent = 'Hội thoại mới';
        messagesContainer.innerHTML = '';
        
        // Thêm tin nhắn chào mừng
        addMessageToUI('Xin chào! Tôi là trợ lý Code Supporter. Bạn cần giúp đỡ gì về lập trình?', 'bot');
        
        // Kích hoạt lại input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
        
        // Đóng sidebar trên mobile
        if (window.innerWidth <= 768) {
            chatSidebar.classList.remove('show');
        }
    }
    
    // Hiển thị trạng thái trống
    function renderEmptyState() {
        chatTitle.textContent = 'Code Supporter';
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h3>Chào mừng đến với Code Supporter</h3>
                <p>Hãy bắt đầu một hội thoại mới để được hỗ trợ về lập trình.</p>
                <button id="start-new-chat" class="primary-button" style="margin-top: 20px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Tạo hội thoại mới
                </button>
            </div>
        `;
        
        // Thêm event listener cho nút tạo hội thoại mới
        const startNewChatButton = document.getElementById('start-new-chat');
        if (startNewChatButton) {
            startNewChatButton.addEventListener('click', createNewConversation);
        }
    }
    
    // Đổi tên hội thoại
    function renameConversation(conversationId, newTitle) {
        if (!conversationId || !newTitle) return;
        
        // Gọi API để đổi tên hội thoại
        fetch(`/api/conversations/${conversationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                title: newTitle
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            // Cập nhật danh sách hội thoại
            const index = conversations.findIndex(c => c.id === conversationId);
            if (index !== -1) {
                conversations[index].title = newTitle;
            }
            
            // Cập nhật UI
            renderConversationList();
            chatTitle.textContent = newTitle;
            
            // Hiển thị thông báo thành công
            showToast('Đã đổi tên hội thoại thành công');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Lỗi khi đổi tên hội thoại', 'error');
        });
    }
    
    // Xóa một hội thoại
    function deleteConversation(conversationId) {
        if (!conversationId) return;
        
        // Gọi API để xóa hội thoại
        fetch(`/api/conversations/${conversationId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            // Xóa hội thoại khỏi danh sách
            conversations = conversations.filter(c => c.id !== conversationId);
            
            // Cập nhật UI
            renderConversationList();
            
            // Nếu xóa hội thoại hiện tại, chuyển sang hội thoại khác hoặc tạo mới
            if (currentConversationId === conversationId) {
                if (conversations.length > 0) {
                    loadConversation(conversations[0].id);
                } else {
                    renderEmptyState();
                }
            }
            
            // Hiển thị thông báo thành công
            showToast('Đã xóa hội thoại thành công');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Lỗi khi xóa hội thoại', 'error');
        });
    }
    
    // Xóa tất cả hội thoại
    function clearAllConversations() {
        // Gọi API để xóa tất cả hội thoại
        fetch('/api/conversations', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            return response.json();
        })
        .then(data => {
            // Xóa tất cả hội thoại khỏi danh sách
            conversations = [];
            
            // Cập nhật UI
            renderConversationList();
            renderEmptyState();
            
            // Hiển thị thông báo thành công
            showToast('Đã xóa tất cả hội thoại thành công');
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Lỗi khi xóa tất cả hội thoại', 'error');
        });
    }
    
    // ===== Các hàm xử lý tin nhắn =====
    // Gửi tin nhắn
    function sendMessage() {
        // Kiểm tra messageInput tồn tại và không đang chờ phản hồi
        if (!messageInput || isWaitingForResponse) return;
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Hiển thị tin nhắn của người dùng
        addMessageToUI(message, 'user');
        
        // Xóa nội dung input và reset kích thước
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Vô hiệu hóa input và nút gửi
        messageInput.disabled = true;
        sendButton.disabled = true;
        isWaitingForResponse = true;
        
        // Hiển thị typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Tạo hoặc cập nhật hội thoại
        let apiURL = '/api/chat/stream';
        let apiMethod = 'POST';
        let apiBody = { message };

        // Nếu đang trong một hội thoại cụ thể, thêm conversation_id
        if (currentConversationId) {  // Thêm kiểm tra null/undefined
            apiBody.conversation_id = currentConversationId;
        }

        // Sử dụng fetch để kết nối tới API stream
        streamChatResponse(message, typingIndicator, apiURL, apiMethod, apiBody);
    }
    
    // Xử lý stream chat response
    function streamChatResponse(message, typingIndicator, apiURL, apiMethod, apiBody) {
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
        currentStreamBuffer = '';
        let lastProcessedLength = 0;
        let pendingChunks = [];
        let isProcessing = false;
        
        // Bộ đếm để giúp ổn định tần suất cập nhật DOM
        let updateCounter = 0;
        
        // Xóa typing indicator và thêm response container vào messages
        if (typingIndicator) typingIndicator.remove();
        messagesContainer.appendChild(responseMsgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Thiết lập interval để cập nhật nội dung trơn tru hơn
        if (streamUpdateInterval) {
            clearInterval(streamUpdateInterval);
        }
        
        streamUpdateInterval = setInterval(() => {
            if (pendingChunks.length > 0 && !isProcessing) {
                isProcessing = true;
                
                // Xử lý tất cả các chunk đang chờ
                const chunks = [...pendingChunks];
                pendingChunks = [];
                
                // Cập nhật buffer từ các chunk
                chunks.forEach(chunk => {
                    currentStreamBuffer += chunk;
                });
                
                // Chỉ cập nhật DOM khi có nội dung mới đáng kể hoặc theo chu kỳ
                if (currentStreamBuffer.length - lastProcessedLength > 2 || updateCounter % 3 === 0) {
                    // Cập nhật nội dung với định dạng sơ bộ (hiệu suất cao hơn)
                    contentDiv.innerHTML = simpleMarkdownFormat(currentStreamBuffer);
                    lastProcessedLength = currentStreamBuffer.length;
                    
                    // Đảm bảo scroll luôn ở cuối
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                updateCounter++;
                isProcessing = false;
            }
        }, 60);
        
        // Gửi request đến endpoint stream
        fetch(apiURL, {
            method: apiMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(apiBody)
        }).then(response => {
            if (!response.ok) {
                throw new Error('Lỗi kết nối với server');
            }
            
            // Xử lý stream response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            function processStream({ done, value }) {
                if (done) {
                    // Hoàn thành, cập nhật final formatting và bật lại input
                    clearInterval(streamUpdateInterval);
                    
                    // Xử lý formatting cuối cùng khi stream kết thúc
                    setTimeout(() => {
                        contentDiv.innerHTML = formatMarkdown(currentStreamBuffer);
                        
                        // Thêm nút copy cho code blocks
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
                        
                        // Highlight code nếu có thư viện Prism
                        if (window.Prism) {
                            responseMsgDiv.querySelectorAll('pre code').forEach(block => {
                                Prism.highlightElement(block);
                            });
                        }
                        
                        // Đảm bảo scroll cuối cùng
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 50);
                    
                    // Kích hoạt lại input và nút gửi
                    messageInput.disabled = false;
                    sendButton.disabled = false;
                    messageInput.focus();
                    isWaitingForResponse = false;
                    
                    // Tải lại danh sách hội thoại để cập nhật
                    loadConversations();
                    
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
                                // Thêm chunk vào pending để xử lý trong interval
                                pendingChunks.push(data.chunk);
                            } else if (data.conversation_id) {
                                // Nếu nhận được conversation_id mới, cập nhật
                                if (!currentConversationId) {
                                    currentConversationId = data.conversation_id;
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
            
            // Xóa interval
            if (streamUpdateInterval) {
                clearInterval(streamUpdateInterval);
            }
            
            // Hiển thị thông báo lỗi
            contentDiv.innerHTML = `<p>Đã xảy ra lỗi khi kết nối với server: ${error.message}</p>`;
            
            // Kích hoạt lại input và nút gửi
            messageInput.disabled = false;
            sendButton.disabled = false;
            messageInput.focus();
            isWaitingForResponse = false;
        });
    }
    
    // Thêm tin nhắn vào UI
    function addMessageToUI(content, sender) {
        // Kiểm tra messagesContainer tồn tại
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'bot' || sender === 'assistant') {
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
    
    // Hiển thị typing indicator
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
    
    // ===== Các hàm tiện ích =====
    // Định dạng markdown đơn giản cho streaming (chỉ xử lý cơ bản)
    function simpleMarkdownFormat(text) {
        // Phát hiện và xử lý code blocks
        let formatted = text;
        
        // Xử lý code blocks trong quá trình stream
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        if (codeBlockRegex.test(formatted)) {
            formatted = formatted.replace(codeBlockRegex, function(match, language, code) {
                return `<pre><code class="language-${language}">${escapeHTML(code)}</code></pre>`;
            });
        } else {
            // Nếu code block chưa đóng, tìm lần xuất hiện cuối cùng của ```
            const lastCodeBlockStart = formatted.lastIndexOf('```');
            if (lastCodeBlockStart !== -1 && (formatted.substring(lastCodeBlockStart).split('\n').length > 1)) {
                // Bỏ qua những phần code block chưa hoàn thành để tránh bị vỡ giao diện
                const beforeLastCodeBlock = formatted.substring(0, lastCodeBlockStart);
                formatted = beforeLastCodeBlock + '<pre><code>' + 
                           escapeHTML(formatted.substring(lastCodeBlockStart + 3)) + '</code></pre>';
            }
        }
        
        // Xử lý inline code - làm cho cẩn thận để không bị lỗi nửa chừng
        let inlineCodeMatches = formatted.match(/`([^`]+)`/g);
        if (inlineCodeMatches) {
            inlineCodeMatches.forEach(match => {
                formatted = formatted.replace(match, '<code>' + escapeHTML(match.slice(1, -1)) + '</code>');
            });
        }
        
        // Xử lý bold
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Xử lý italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Xử lý xuống dòng mà không phá vỡ các phần tử HTML
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    // Định dạng markdown đầy đủ
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
    
    // Escape HTML
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Định dạng thời gian
    function formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    // Định dạng ngày tháng
    function formatDate(date) {
        // Nếu là ngày hôm nay, chỉ hiển thị giờ
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return `Hôm nay, ${formatTime(date)}`;
        }
        
        // Nếu là ngày hôm qua, hiển thị "Hôm qua"
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Hôm qua, ${formatTime(date)}`;
        }
        
        // Ngày trong tuần này
        const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayDiff = (today.getTime() - date.getTime()) / (1000 * 3600 * 24);
        if (dayDiff < 7) {
            return `${dayOfWeek[date.getDay()]}, ${formatTime(date)}`;
        }
        
        // Ngày khác
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Lấy token từ cookie
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
    
    // Hiển thị thông báo
    function showToast(message, type = 'success') {
        // Kiểm tra nếu đã có snackbar, xóa đi
        const existingToast = document.querySelector('.snackbar');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Tạo snackbar mới
        const toast = document.createElement('div');
        toast.className = `snackbar ${type === 'error' ? 'snackbar-error' : 'snackbar-success'}`;
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'error' 
                    ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
                    : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
            </svg>
            <span>${message}</span>
        `;
        
        // Thêm vào body
        document.body.appendChild(toast);
        
        // Hiển thị
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Ẩn sau 3 giây
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Khởi tạo syntax highlighting
    function initCodeHighlighting() {
        // Kiểm tra xem Prism đã được tải chưa
        if (!window.Prism && typeof document !== 'undefined') {
            // Tải thư viện chính trước
            const prismScript = document.createElement('script');
            prismScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js';
            prismScript.onload = function() {
                // Sau khi thư viện chính tải xong, mới tải các ngôn ngữ
                const languages = ['javascript', 'python', 'java', 'php', 'csharp', 'cpp', 'ruby', 'bash', 'sql', 'html', 'css'];
                languages.forEach(lang => {
                    const langScript = document.createElement('script');
                    langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-${lang}.min.js`;
                    document.head.appendChild(langScript);
                });
            };
            document.head.appendChild(prismScript);
            
            // Thêm CSS
            const prismCSS = document.createElement('link');
            prismCSS.rel = 'stylesheet';
            prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css';
            document.head.appendChild(prismCSS);
        }
    }
    
    // Đặt focus vào input khi trang được tải
    if (messageInput) {
        setTimeout(() => {
            messageInput.focus();
        }, 100);
    }
});

