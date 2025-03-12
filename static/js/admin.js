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
    
    // Xử lý tạo API key
    createApiKeyButton.addEventListener('click', function() {
        const name = apiKeyNameInput.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên cho API key');
            return;
        }
        
        // Lấy danh sách quyền được chọn
        const permissions = [];
        if (permissionChatCheckbox.checked) {
            permissions.push('chat');
        }
        if (permissionStreamCheckbox.checked) {
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
            apiKeyValue.textContent = data.api_key;
            apiSecretValue.textContent = data.api_secret;
            apiKeyResult.style.display = 'block';
            
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
    
    // Xử lý copy code
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            
            let textToCopy;
            if (targetId === 'api-key-value' || targetId === 'api-secret-value') {
                textToCopy = document.getElementById(targetId).textContent;
            } else {
                // Copy code snippets
                const codeElement = this.closest('pre').querySelector('code');
                textToCopy = codeElement.textContent;
            }
            
            // Copy vào clipboard
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    // Hiển thị thông báo đã copy
                    const originalText = this.innerHTML;
                    this.innerHTML = '<span>Copied!</span>';
                    
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    alert('Không thể copy vào clipboard.');
                });
        });
    });
    
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
