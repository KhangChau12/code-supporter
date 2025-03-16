// onboarding-tour.js - Hướng dẫn trực quan cho người dùng mới
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem người dùng đã xem tour chưa - CHỈ HIỂN THỊ LẦN ĐẦU
    const hasSeenTour = localStorage.getItem('codesupporter_seen_tour');
    
    // Thêm nút "Xem hướng dẫn" vào header
    function addTourButton() {
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            const tourButton = document.createElement('button');
            tourButton.id = 'start-tour-button';
            tourButton.className = 'nav-link';
            tourButton.title = 'Xem hướng dẫn';
            tourButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span class="nav-text">Hướng dẫn</span>
            `;
            
            // Chèn trước nút theme toggle
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                userInfo.insertBefore(tourButton, themeToggle);
            } else {
                userInfo.appendChild(tourButton);
            }
            
            // Thêm event listener
            tourButton.addEventListener('click', startTour);
        }
    }
    
    // Chờ Shepherd tải xong (nếu đã tải trước đó)
    setTimeout(() => {
        // Thêm nút tour
        addTourButton();
        
        // Tự động bắt đầu tour cho người dùng mới - CHỈ HIỂN THỊ LẦN ĐẦU
        if (!hasSeenTour && window.location.pathname.includes('/chat')) {
            setTimeout(() => {
                startTour();
                // Đánh dấu đã xem tour
                localStorage.setItem('codesupporter_seen_tour', 'true');
            }, 1000);
        }
    }, 500);
    
    // Hàm bắt đầu tour
    function startTour() {
        // Kiểm tra nếu Shepherd chưa được tải
        if (typeof Shepherd === 'undefined') {
            console.error('Shepherd không được tải');
            // Tải Shepherd nếu chưa có
            const shepherdScript = document.createElement('script');
            shepherdScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/shepherd.js/11.0.0/shepherd.min.js';
            
            // Thêm Shepherd stylesheet
            const shepherdStyles = document.createElement('link');
            shepherdStyles.rel = 'stylesheet';
            shepherdStyles.href = 'https://cdnjs.cloudflare.com/ajax/libs/shepherd.js/11.0.0/css/shepherd.min.css';
            document.head.appendChild(shepherdStyles);
            
            // Khi Shepherd tải xong thì bắt đầu tour
            shepherdScript.onload = createAndStartTour;
            document.body.appendChild(shepherdScript);
        } else {
            createAndStartTour();
        }
    }
    
    // Hàm tạo và bắt đầu tour
    function createAndStartTour() {
        // Tạo một tour mới
        const tour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                cancelIcon: {
                    enabled: true
                },
                classes: 'shepherd-theme-custom',
                scrollTo: true,
                modalOverlayOpeningPadding: 10
            },
            exitOnEsc: true
        });
        
        // Các bước của tour
        // 1. Giới thiệu
        tour.addStep({
            id: 'welcome',
            title: 'Chào mừng đến với Code Supporter!',
            text: 'Hướng dẫn này sẽ giới thiệu các tính năng chính của Code Supporter. Hãy bắt đầu nhé!',
            buttons: [
                {
                    text: 'Bỏ qua',
                    action: tour.complete
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 2. Sidebar hội thoại
        tour.addStep({
            id: 'conversations-sidebar',
            title: 'Danh sách hội thoại',
            text: 'Đây là danh sách các hội thoại của bạn. Nhấp vào một hội thoại để xem nội dung.',
            attachTo: {
                element: '.chat-sidebar',
                on: 'right'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 3. Nút tạo hội thoại mới
        tour.addStep({
            id: 'new-chat',
            title: 'Tạo hội thoại mới',
            text: 'Nhấn vào đây để bắt đầu một hội thoại mới với Code Supporter.',
            attachTo: {
                element: '#new-chat-button',
                on: 'right'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 4. Khu vực tin nhắn
        tour.addStep({
            id: 'messages-area',
            title: 'Khu vực tin nhắn',
            text: 'Đây là nơi hiển thị các tin nhắn trong hội thoại hiện tại.',
            attachTo: {
                element: '.messages',
                on: 'left'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 5. Khu vực nhập tin nhắn
        tour.addStep({
            id: 'input-area',
            title: 'Nhập tin nhắn',
            text: 'Nhập câu hỏi về lập trình hoặc vấn đề bạn cần hỗ trợ tại đây.',
            attachTo: {
                element: '.input-container',
                on: 'top'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 6. Tiêu đề hội thoại và actions
        tour.addStep({
            id: 'chat-header',
            title: 'Quản lý hội thoại',
            text: 'Tại đây bạn có thể đổi tên hoặc xóa hội thoại hiện tại.',
            attachTo: {
                element: '.chat-header',
                on: 'bottom'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 7. Nút API keys (nếu có)
        const apiKeysButton = document.querySelector('a[href="/admin"]');
        if (apiKeysButton) {
            tour.addStep({
                id: 'api-keys',
                title: 'Quản lý API keys',
                text: 'Nhấn vào đây để truy cập trang quản lý API keys cho việc tích hợp.',
                attachTo: {
                    element: 'a[href="/admin"]',
                    on: 'bottom'
                },
                buttons: [
                    {
                        text: 'Quay lại',
                        action: tour.back
                    },
                    {
                        text: 'Tiếp theo',
                        action: tour.next
                    }
                ]
            });
        }
        
        // 8. Nút chuyển đổi chế độ sáng/tối
        tour.addStep({
            id: 'theme-toggle',
            title: 'Chuyển đổi chế độ sáng/tối',
            text: 'Nhấn vào đây để chuyển đổi giữa chế độ sáng và tối.',
            attachTo: {
                element: '#theme-toggle',
                on: 'bottom'
            },
            buttons: [
                {
                    text: 'Quay lại',
                    action: tour.back
                },
                {
                    text: 'Tiếp theo',
                    action: tour.next
                }
            ]
        });
        
        // 9. Kết thúc
        tour.addStep({
            id: 'end-tour',
            title: 'Sẵn sàng!',
            text: 'Bạn đã hoàn thành hướng dẫn cơ bản. Hãy bắt đầu sử dụng Code Supporter để được hỗ trợ về lập trình!',
            buttons: [
                {
                    text: 'Kết thúc',
                    action: tour.complete
                }
            ]
        });
        
        // Bắt đầu tour
        tour.start();
    }
    
    // Thêm CSS tùy chỉnh cho tour
    const customStyles = document.createElement('style');
    customStyles.textContent = `
        .shepherd-theme-custom .shepherd-content {
            border-radius: 8px;
            box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
        }
        
.shepherd-theme-custom .shepherd-text {
            font-size: 15px;
            line-height: 1.6;
        }
        
        .shepherd-theme-custom .shepherd-footer {
            padding-top: 10px;
        }
        
        .shepherd-theme-custom .shepherd-button {
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: 500;
            margin-right: 8px;
        }
        
        .shepherd-theme-custom .shepherd-button:last-child {
            background-color: var(--primary-color);
        }
        
        .shepherd-theme-custom .shepherd-button:not(:last-child) {
            background-color: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
        }
        
        .shepherd-theme-custom .shepherd-button:not(:last-child):hover {
            background-color: var(--input-bg);
        }
        
        .shepherd-theme-custom .shepherd-title {
            font-size: 18px;
            font-weight: 600;
        }
        
        .shepherd-theme-custom .shepherd-header {
            padding: 16px 16px 0 16px;
        }
        
        /* Nút Tour trong header */
        #start-tour-button {
            display: flex;
            align-items: center;
            color: var(--text-color);
            text-decoration: none;
            background-color: rgba(99, 102, 241, 0.05);
            padding: 8px 16px;
            border-radius: 8px;
            transition: all 0.3s;
            margin-right: 10px;
            border: none;
            cursor: pointer;
        }
        
        #start-tour-button:hover {
            background-color: var(--primary-color);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
        }
        
        #start-tour-button svg {
            margin-right: 6px;
        }
    `;
    document.head.appendChild(customStyles);
});