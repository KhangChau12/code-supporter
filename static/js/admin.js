// admin.js - Xử lý chức năng trang admin
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const themeToggle = document.getElementById('theme-toggle');
    const logoutButton = document.getElementById('logout-button');
    const createApiKeyButton = document.getElementById('create-api-key');
    const apiKeyNameInput = document.getElementById('api-key-name');
    const permissionChatCheckbox = document.getElementById('permission-chat');
    const permissionStreamCheckbox = document.getElementById('permission-stream');
    const apiKeyResult = document.getElementById('api-key-result');
    const apiKeyValue = document.getElementById('api-key-value');
    const apiSecretValue = document.getElementById('api-secret-value');
    
    // Kiểm tra các phần tử DOM tồn tại trước khi thêm event listeners
    
    // Kiểm tra và áp dụng theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Xử lý chuyển đổi theme
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        });
    }
    
    // Xử lý đăng xuất
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Xóa cookie token
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            // Chuyển hướng về trang đăng nhập
            window.location.href = '/login';
        });
    }
    
    // Xử lý tạo API key
    if (createApiKeyButton && apiKeyNameInput) {
        createApiKeyButton.addEventListener('click', function() {
            const name = apiKeyNameInput.value.trim();
            if (!name) {
                alert('Vui lòng nhập tên cho API key');
                return;
            }
            
            // Lấy danh sách quyền được chọn
            const permissions = [];
            if (permissionChatCheckbox && permissionChatCheckbox.checked) {
                permissions.push('chat');
            }
            if (permissionStreamCheckbox && permissionStreamCheckbox.checked) {
                permissions.push('stream');
            }
            
            if (permissions.length === 0) {
                alert('Vui lòng chọn ít nhất một quyền hạn');
                return;
            }
            
            // Hiển thị trạng thái đang tạo
            createApiKeyButton.disabled = true;
            createApiKeyButton.textContent = 'Đang tạo...';
            
            // Gọi API để tạo key
            fetch('/api/apikey/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    name: name,
                    permissions: permissions
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Lỗi kết nối với server');
                }
                return response.json();
            })
            .then(data => {
                // Hiển thị kết quả
                if (apiKeyValue) apiKeyValue.textContent = data.api_key;
                if (apiSecretValue) apiSecretValue.textContent = data.api_secret;
                if (apiKeyResult) apiKeyResult.style.display = 'block';
                
                // Reset form
                apiKeyNameInput.value = '';
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Đã xảy ra lỗi khi tạo API key: ' + error.message);
            })
            .finally(() => {
                // Kích hoạt lại nút tạo
                createApiKeyButton.disabled = false;
                createApiKeyButton.textContent = 'Tạo API Key';
            });
        });
    }
    
    // Xử lý copy code và thông tin API key
    document.addEventListener('click', function(e) {
        const copyButton = e.target.closest('.copy-button');
        if (copyButton) {
            // Tìm nội dung để copy
            let contentToCopy = '';
            const targetId = copyButton.getAttribute('data-target');
            
            if (targetId) {
                // Copy từ element có id
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    contentToCopy = targetElement.textContent;
                }
            } else {
                // Copy từ code snippet
                const codeElement = copyButton.closest('pre')?.querySelector('code');
                if (codeElement) {
                    contentToCopy = codeElement.textContent;
                }
            }
            
            if (contentToCopy) {
                // Copy vào clipboard
                navigator.clipboard.writeText(contentToCopy)
                    .then(() => {
                        // Hiển thị thông báo đã copy
                        const originalText = copyButton.innerHTML;
                        copyButton.innerHTML = '<span>Copied!</span>';
                        
                        setTimeout(() => {
                            copyButton.innerHTML = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Could not copy text: ', err);
                        alert('Không thể copy vào clipboard.');
                    });
            }
        }
    });
    
    // Xử lý chuyển tab
    const adminTabs = document.querySelectorAll('.admin-tab');
    if (adminTabs.length > 0) {
        adminTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Bỏ active tất cả các tab
                adminTabs.forEach(t => t.classList.remove('active'));
                // Active tab hiện tại
                this.classList.add('active');
                
                // Ẩn tất cả tab content
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Hiển thị tab content tương ứng
                const targetId = this.getAttribute('data-target');
                if (targetId) {
                    const targetContent = document.getElementById(targetId);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                }
            });
        });
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
});