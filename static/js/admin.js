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
    
    // Phần tử cho danh sách API keys
    const apiKeysContainer = document.getElementById('api-keys-container');
    const apiKeysLoading = document.getElementById('api-keys-loading');
    const apiKeysTable = document.getElementById('api-keys-table');
    const apiKeysTableBody = document.getElementById('api-keys-table-body');
    const noApiKeys = document.getElementById('no-api-keys');
    
    // Phần tử cho phân tích dữ liệu
    const analyticsApiKeySelect = document.getElementById('analytics-api-key');
    const loadAnalyticsButton = document.getElementById('load-analytics');
    const analyticsData = document.getElementById('analytics-data');
    const analyticsLoading = document.getElementById('analytics-loading');
    const noAnalyticsData = document.getElementById('no-analytics-data');
    const totalUsers = document.getElementById('total-users');
    const totalRequests = document.getElementById('total-requests');
    const activeUsers24h = document.getElementById('active-users-24h');
    const activeUsers7d = document.getElementById('active-users-7d');
    const apiUsersTableBody = document.getElementById('api-users-table-body');
    
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
    
    // Tải danh sách API keys khi trang được tải
    loadApiKeys();
    
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
                
                // Cập nhật danh sách API keys
                loadApiKeys();
                
                // Cập nhật danh sách API keys trong dropdown phân tích
                loadApiKeysForAnalytics();
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
    
    // Xử lý phân tích dữ liệu
    if (loadAnalyticsButton) {
        loadAnalyticsButton.addEventListener('click', function() {
            const apiKey = analyticsApiKeySelect.value;
            loadAnalytics(apiKey);
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
                
                // Nếu chuyển sang tab phân tích, tải danh sách API keys cho dropdown
                if (targetId === 'analytics-tab') {
                    loadApiKeysForAnalytics();
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
    
    // Hàm tải danh sách API keys
    function loadApiKeys() {
        if (!apiKeysContainer || !apiKeysLoading || !apiKeysTable || !apiKeysTableBody || !noApiKeys) {
            return;
        }
        
        // Hiển thị loading
        apiKeysLoading.style.display = 'flex';
        apiKeysTable.style.display = 'none';
        noApiKeys.style.display = 'none';
        
        // Gọi API để lấy danh sách API keys
        fetch('/api/apikey/list', {
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
            // Xóa dữ liệu cũ
            apiKeysTableBody.innerHTML = '';
            
            // Kiểm tra có dữ liệu không
            if (data.api_keys && data.api_keys.length > 0) {
                // Hiển thị bảng
                apiKeysTable.style.display = 'table';
                noApiKeys.style.display = 'none';
                
                // Thêm dữ liệu vào bảng
                data.api_keys.forEach(key => {
                    const row = document.createElement('tr');
                    
                    // Cột Tên
                    const nameCell = document.createElement('td');
                    nameCell.textContent = key.name;
                    row.appendChild(nameCell);
                    
                    // Cột API Key
                    const keyCell = document.createElement('td');
                    keyCell.textContent = key.key;
                    row.appendChild(keyCell);
                    
                    // Cột Quyền hạn
                    const permissionsCell = document.createElement('td');
                    permissionsCell.textContent = key.permissions.join(', ');
                    row.appendChild(permissionsCell);
                    
                    // Cột Ngày tạo
                    const createdAtCell = document.createElement('td');
                    createdAtCell.textContent = formatDate(key.created_at);
                    row.appendChild(createdAtCell);
                    
                    // Cột Lần sử dụng cuối
                    const lastUsedCell = document.createElement('td');
                    lastUsedCell.textContent = key.last_used ? formatDate(key.last_used) : 'Chưa sử dụng';
                    row.appendChild(lastUsedCell);
                    
                    apiKeysTableBody.appendChild(row);
                });
            } else {
                // Hiển thị không có dữ liệu
                apiKeysTable.style.display = 'none';
                noApiKeys.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Hiển thị thông báo lỗi
            apiKeysTable.style.display = 'none';
            noApiKeys.style.display = 'block';
            noApiKeys.querySelector('p').textContent = 'Đã xảy ra lỗi khi tải danh sách API keys.';
        })
        .finally(() => {
            // Ẩn loading
            apiKeysLoading.style.display = 'none';
        });
    }
    
    // Hàm tải danh sách API keys cho dropdown phân tích
    function loadApiKeysForAnalytics() {
        if (!analyticsApiKeySelect) {
            return;
        }
        
        // Gọi API để lấy danh sách API keys
        fetch('/api/apikey/list', {
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
            // Lưu lại giá trị đang chọn
            const selectedValue = analyticsApiKeySelect.value;
            
            // Xóa tất cả options trừ option đầu tiên
            while (analyticsApiKeySelect.options.length > 1) {
                analyticsApiKeySelect.remove(1);
            }
            
            // Thêm options mới
            if (data.api_keys && data.api_keys.length > 0) {
                data.api_keys.forEach(key => {
                    const option = document.createElement('option');
                    option.value = key.key;
                    option.textContent = `${key.name} (${key.key})`;
                    analyticsApiKeySelect.appendChild(option);
                });
                
                // Khôi phục giá trị đang chọn nếu có
                if (selectedValue) {
                    analyticsApiKeySelect.value = selectedValue;
                }
            }
        })
        .catch(error => {
            console.error('Error loading API keys for analytics:', error);
        });
    }
    
    // Hàm tải dữ liệu phân tích
    function loadAnalytics(apiKey) {
        if (!analyticsData || !analyticsLoading || !noAnalyticsData || !apiUsersTableBody) {
            return;
        }
        
        // Hiển thị loading
        analyticsLoading.style.display = 'flex';
        analyticsData.style.display = 'none';
        noAnalyticsData.style.display = 'none';
        
        // Tạo URL với tham số query nếu có
        let url = '/api/apikey/analytics';
        if (apiKey) {
            url += `?api_key=${apiKey}`;
        }
        
        // Gọi API để lấy dữ liệu phân tích
        fetch(url, {
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
            // Kiểm tra có dữ liệu không
            if (data.total_users > 0) {
                // Cập nhật thống kê
                totalUsers.textContent = data.total_users;
                totalRequests.textContent = data.total_requests;
                activeUsers24h.textContent = data.active_users_24h;
                activeUsers7d.textContent = data.active_users_7d;
                
                // Xóa dữ liệu cũ
                apiUsersTableBody.innerHTML = '';
                
                // Thêm dữ liệu vào bảng
                data.users.forEach(user => {
                    const row = document.createElement('tr');
                    
                    // Cột ID
                    const idCell = document.createElement('td');
                    idCell.textContent = user.user_id;
                    row.appendChild(idCell);
                    
                    // Cột Lần đầu sử dụng
                    const firstSeenCell = document.createElement('td');
                    firstSeenCell.textContent = formatDate(user.first_seen);
                    row.appendChild(firstSeenCell);
                    
                    // Cột Lần cuối sử dụng
                    const lastActiveCell = document.createElement('td');
                    lastActiveCell.textContent = formatDate(user.last_active);
                    row.appendChild(lastActiveCell);
                    
                    // Cột Tổng yêu cầu
                    const totalRequestsCell = document.createElement('td');
                    totalRequestsCell.textContent = user.total_requests;
                    row.appendChild(totalRequestsCell);
                    
                    // Cột Thông tin
                    const userInfoCell = document.createElement('td');
                    if (user.user_info) {
                        // Hiển thị thông tin người dùng dưới dạng JSON
                        const infoText = JSON.stringify(user.user_info, null, 2);
                        userInfoCell.innerHTML = `<pre>${infoText}</pre>`;
                    } else {
                        userInfoCell.textContent = 'Không có';
                    }
                    row.appendChild(userInfoCell);
                    
                    apiUsersTableBody.appendChild(row);
                });
                
                // Hiển thị dữ liệu
                analyticsData.style.display = 'block';
                noAnalyticsData.style.display = 'none';
            } else {
                // Hiển thị không có dữ liệu
                analyticsData.style.display = 'none';
                noAnalyticsData.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            // Hiển thị thông báo lỗi
            analyticsData.style.display = 'none';
            noAnalyticsData.style.display = 'block';
            noAnalyticsData.querySelector('p').textContent = 'Đã xảy ra lỗi khi tải dữ liệu phân tích.';
        })
        .finally(() => {
            // Ẩn loading
            analyticsLoading.style.display = 'none';
        });
    }
    
    // Hàm định dạng ngày tháng
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        // Chuyển đổi chuỗi thành object Date
        const date = new Date(dateString);
        
        // Kiểm tra ngày hợp lệ
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        // Định dạng ngày giờ
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
});

// Xử lý xuất dữ liệu CSV
document.addEventListener('click', function(e) {
    const exportButton = e.target.closest('.action-button[title="Xuất dữ liệu"]');
    if (exportButton) {
        exportUserDataToCSV();
    }
});

function exportUserDataToCSV() {
    // Kiểm tra xem có dữ liệu người dùng không
    const tableBody = document.getElementById('api-users-table-body');
    if (!tableBody || tableBody.rows.length === 0) {
        alert('Không có dữ liệu người dùng để xuất');
        return;
    }
    
    // Lấy tiêu đề cột
    const headers = Array.from(document.querySelectorAll('.user-table th')).map(th => th.textContent.trim());
    
    // Lấy dữ liệu hàng
    const rows = Array.from(tableBody.rows).map(row => {
        return Array.from(row.cells).map(cell => {
            // Nếu cell chứa thẻ pre (cho thông tin JSON), lấy text content
            const pre = cell.querySelector('pre');
            if (pre) {
                return `"${pre.textContent.replace(/"/g, '""')}"`;
            }
            return `"${cell.textContent.replace(/"/g, '""')}"`;
        });
    });
    
    // Tạo nội dung CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Tạo blob và tạo URL cho nó
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Tạo thẻ a để tải xuống
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `api-users-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    // Thêm vào DOM, kích hoạt sự kiện click, và xóa khỏi DOM
    document.body.appendChild(link);
    link.click();
    
    // Dọn dẹp
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

