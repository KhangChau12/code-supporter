// tooltip-utility.js - Tiện ích để thêm tooltips tự động vào giao diện

class TooltipManager {
    constructor(options = {}) {
        this.options = {
            showOnlyForNewUsers: false,
            animationDelay: 'tooltip-delay-short',
            position: 'bottom',
            ...options
        };
        
        // Kiểm tra người dùng mới
        this.isNewUser = !localStorage.getItem('codesupporter_seen_tooltips');
        
        // Tự động khởi tạo
        this.init();
    }
    
    init() {
        // Nếu chỉ hiển thị cho người dùng mới và người dùng không phải mới, thì thoát
        if (this.options.showOnlyForNewUsers && !this.isNewUser) {
            return;
        }
        
        // Áp dụng tooltips thông thường
        this.applyStaticTooltips();
        
        // Đánh dấu người dùng đã thấy tooltips
        localStorage.setItem('codesupporter_seen_tooltips', 'true');
    }
    
    /**
     * Thêm tooltip cho một phần tử
     * @param {Element} element - Phần tử cần thêm tooltip
     * @param {String} content - Nội dung tooltip
     * @param {Object} options - Tùy chọn
     */
    addTooltip(element, content, options = {}) {
        const finalOptions = {
            position: this.options.position,
            className: '',
            title: '',
            animation: this.options.animationDelay,
            ...options
        };
        
        // Thêm class has-tooltip
        element.classList.add('has-tooltip');
        
        // Tạo tooltip container
        const tooltipContainer = document.createElement('div');
        tooltipContainer.className = `tooltip-container tooltip-${finalOptions.position} ${finalOptions.animation} ${finalOptions.className}`;
        
        // Thêm tiêu đề nếu có
        let tooltipContent = '';
        if (finalOptions.title) {
            tooltipContent += `<span class="tooltip-title">${finalOptions.title}</span>`;
        }
        
        // Thêm nội dung
        tooltipContent += content;
        tooltipContainer.innerHTML = tooltipContent;
        
        // Thêm vào phần tử
        element.appendChild(tooltipContainer);
        
        return tooltipContainer;
    }
    
    /**
     * Thêm tooltips cho nhiều phần tử
     * @param {String} selector - CSS selector cho các phần tử
     * @param {String} content - Nội dung tooltip
     * @param {Object} options - Tùy chọn
     */
    addTooltips(selector, content, options = {}) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            this.addTooltip(element, content, options);
        });
    }
    
    /**
     * Thêm tooltips cho một phần tử dựa trên attribute data-tooltip
     * @param {Element} element - Phần tử cần thêm tooltip
     */
    processElementTooltip(element) {
        const content = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || this.options.position;
        const title = element.getAttribute('data-tooltip-title') || '';
        const className = element.getAttribute('data-tooltip-class') || '';
        
        if (content) {
            this.addTooltip(element, content, {
                position,
                title,
                className
            });
        }
    }
    
    /**
     * Thêm tooltips cho các phần tử có attribute data-tooltip
     */
    applyStaticTooltips() {
        const elements = document.querySelectorAll('[data-tooltip]');
        elements.forEach(element => {
            this.processElementTooltip(element);
        });
    }
    
    /**
     * Thêm tooltips đặc biệt cho các tính năng mới
     * @param {String} selector - CSS selector cho các phần tử
     * @param {String} content - Nội dung tooltip
     */
    addFeatureTooltip(selector, content) {
        this.addTooltips(selector, content, {
            className: 'feature-tooltip',
            title: 'Tính năng mới',
            animation: 'tooltip-delay-medium'
        });
        
        // Thêm hiệu ứng "Mới" cho các phần tử
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('new-user-tooltip');
        });
    }
    
    /**
     * Làm mới tooltips (gọi khi DOM thay đổi)
     */
    refresh() {
        // Xóa các tooltips hiện tại
        document.querySelectorAll('.has-tooltip .tooltip-container').forEach(tooltip => {
            tooltip.remove();
        });
        
        document.querySelectorAll('.has-tooltip').forEach(element => {
            element.classList.remove('has-tooltip');
        });
        
        // Áp dụng lại
        this.applyStaticTooltips();
    }
    
    /**
     * Thêm tooltips cho hướng dẫn
     * @param {Array} steps - Các bước hướng dẫn
     */
    addTutorialTooltips(steps) {
        if (!this.isNewUser) return;
        
        steps.forEach((step, index) => {
            setTimeout(() => {
                const element = document.querySelector(step.selector);
                if (element) {
                    const tooltip = this.addTooltip(element, step.content, {
                        position: step.position || 'bottom',
                        title: step.title || 'Mẹo:',
                        className: 'tutorial-tooltip'
                    });
                    
                    // Tự động ẩn sau 5 giây
                    setTimeout(() => {
                        tooltip.style.opacity = '0';
                        setTimeout(() => {
                            tooltip.remove();
                            element.classList.remove('has-tooltip');
                        }, 300);
                    }, 5000);
                }
            }, index * 6000); // Hiển thị mỗi 6 giây
        });
    }
}

// Khởi tạo khi trang được tải xong
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo TooltipManager
    window.tooltipManager = new TooltipManager();
    
    // Ví dụ về cách sử dụng với các phần tử có sẵn attribute
    // <button data-tooltip="Đây là nút gửi tin nhắn" data-tooltip-position="top">Gửi</button>
    
    // Ví dụ về cách thêm tooltip bằng JavaScript
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        window.tooltipManager.addTooltip(sendButton, 'Gửi tin nhắn của bạn tới Code Supporter', {
            position: 'top'
        });
    }
    
    // Thêm tooltips cho các tính năng chính trên trang chat
    if (window.location.pathname.includes('/chat')) {
        // Thêm tooltips cho các thành phần UI chính
        const tooltips = {
            '#new-chat-button': 'Bắt đầu một cuộc trò chuyện mới với Code Supporter',
            '.chat-title': 'Tên cuộc trò chuyện hiện tại. Nhấp vào để đổi tên.',
            '#rename-conversation': 'Đổi tên cuộc trò chuyện',
            '#delete-conversation': 'Xóa cuộc trò chuyện này',
            '#message-input': 'Nhập câu hỏi hoặc vấn đề lập trình của bạn tại đây',
            '#theme-toggle': 'Chuyển đổi giữa chế độ sáng và tối',
            '#logout-button': 'Đăng xuất khỏi tài khoản',
            '#clear-all-conversations': 'Xóa tất cả cuộc trò chuyện'
        };
        
        // Thêm từng tooltip
        for (const selector in tooltips) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                window.tooltipManager.addTooltip(element, tooltips[selector], {
                    position: selector === '#message-input' || selector === '#clear-all-conversations' ? 'top' : 'bottom'
                });
            });
        }
        
        // Thêm hướng dẫn tự động cho người dùng mới
        if (!localStorage.getItem('codesupporter_seen_tooltips')) {
            // Thêm tooltips tự động hiển thị tuần tự cho người dùng mới
            const tutorialSteps = [
                {
                    selector: '#new-chat-button',
                    title: 'Bắt đầu ở đây!',
                    content: 'Nhấn vào đây để bắt đầu một cuộc trò chuyện mới.',
                    position: 'right'
                },
                {
                    selector: '#message-input',
                    title: 'Đặt câu hỏi',
                    content: 'Nhập câu hỏi về lập trình và nhấn Enter để gửi.',
                    position: 'top'
                },
                {
                    selector: '.chat-header',
                    title: 'Quản lý hội thoại',
                    content: 'Bạn có thể đổi tên hoặc xóa cuộc trò chuyện từ đây.',
                    position: 'bottom'
                },
                {
                    selector: '#theme-toggle',
                    title: 'Tùy chỉnh giao diện',
                    content: 'Thay đổi giữa chế độ sáng và tối tùy theo sở thích của bạn.',
                    position: 'bottom'
                }
            ];
            
            window.tooltipManager.addTutorialTooltips(tutorialSteps);
        }
    }
    
    // Thêm tooltips cho trang Admin (API keys)
    if (window.location.pathname.includes('/admin')) {
        const adminTooltips = {
            '#create-api-key': 'Tạo API key mới cho ứng dụng của bạn',
            '#permission-chat': 'Cho phép sử dụng API chat cơ bản',
            '#permission-stream': 'Cho phép sử dụng API chat với phản hồi kiểu stream',
            '#api-key-name': 'Đặt tên để dễ dàng phân biệt các API key'
        };
        
        for (const selector in adminTooltips) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                window.tooltipManager.addTooltip(element, adminTooltips[selector], {
                    position: 'top'
                });
            });
        }
        
        // Đánh dấu tính năng mới nếu có
        window.tooltipManager.addFeatureTooltip('.admin-tabs [data-target="analytics-tab"]', 'Phân tích dữ liệu của API key');
    }
});

// API đơn giản để thêm tooltip
window.addTooltip = function(element, content, options = {}) {
    if (!window.tooltipManager) {
        window.tooltipManager = new TooltipManager();
    }
    return window.tooltipManager.addTooltip(element, content, options);
};

// API để thêm tooltips bằng attribute
window.setupTooltips = function() {
    if (!window.tooltipManager) {
        window.tooltipManager = new TooltipManager();
    } else {
        window.tooltipManager.refresh();
    }
};

// API để thêm tooltips cho các phần tử mới (gọi khi DOM thay đổi)
window.refreshTooltips = function() {
    if (window.tooltipManager) {
        window.tooltipManager.refresh();
    }
};