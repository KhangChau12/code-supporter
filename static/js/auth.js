// auth.js - Xử lý đăng nhập và đăng ký
document.addEventListener('DOMContentLoaded', function() {
    // Lấy các phần tử DOM
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    
    // Kiểm tra chế độ (sáng/tối)
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Chuyển đổi giữa các tab
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        clearErrors();
    });
    
    registerTab.addEventListener('click', function() {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        clearErrors();
    });
    
    // Xử lý đăng nhập
    loginButton.addEventListener('click', function() {
        handleLogin();
    });
    
    // Xử lý đăng ký
    registerButton.addEventListener('click', function() {
        handleRegister();
    });
    
    // Xử lý nhấn Enter
    document.getElementById('login-username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('login-password').focus();
        }
    });
    
    document.getElementById('login-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    document.getElementById('register-username').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('register-password').focus();
        }
    });
    
    document.getElementById('register-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('register-confirm').focus();
        }
    });
    
    document.getElementById('register-confirm').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleRegister();
        }
    });
    
    // Hàm xử lý đăng nhập
    function handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        // Validate
        if (!username || !password) {
            showError(loginError, 'Vui lòng nhập tên đăng nhập và mật khẩu');
            return;
        }
        
        // Disable login button và hiển thị loading
        setLoading(loginButton, true);
        
        // Gọi API đăng nhập
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(loginError, data.error);
                setLoading(loginButton, false);
            } else {
                // Lưu token vào cookie
                const expires = new Date();
                expires.setDate(expires.getDate() + 1); // Hết hạn sau 1 ngày
                document.cookie = `token=${data.token}; expires=${expires.toUTCString()}; path=/`;
                
                // Chuyển hướng đến trang chat
                window.location.href = '/chat';
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showError(loginError, 'Đã xảy ra lỗi khi kết nối với server');
            setLoading(loginButton, false);
        });
    }
    
    // Hàm xử lý đăng ký
    function handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        // Validate
        if (!username || !password) {
            showError(registerError, 'Vui lòng nhập tên đăng nhập và mật khẩu');
            return;
        }
        
        if (username.length < 3) {
            showError(registerError, 'Tên đăng nhập phải có ít nhất 3 ký tự');
            return;
        }
        
        if (password.length < 6) {
            showError(registerError, 'Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        
        if (password !== confirm) {
            showError(registerError, 'Xác nhận mật khẩu không khớp');
            return;
        }
        
        // Disable register button và hiển thị loading
        setLoading(registerButton, true);
        
        // Gọi API đăng ký
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(registerError, data.error);
                setLoading(registerButton, false);
            } else {
                // Lưu token vào cookie
                const expires = new Date();
                expires.setDate(expires.getDate() + 1); // Hết hạn sau 1 ngày
                document.cookie = `token=${data.token}; expires=${expires.toUTCString()}; path=/`;
                
                // Chuyển hướng đến trang chat
                window.location.href = '/chat';
            }
        })
        .catch(error => {
            console.error('Register error:', error);
            showError(registerError, 'Đã xảy ra lỗi khi kết nối với server');
            setLoading(registerButton, false);
        });
    }
    
    // Các utility functions
    function showError(element, message) {
        element.textContent = message;
        element.classList.add('active');
    }
    
    function clearErrors() {
        loginError.textContent = '';
        loginError.classList.remove('active');
        registerError.textContent = '';
        registerError.classList.remove('active');
    }
    
    function setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = 'Đang xử lý...';
        } else {
            button.disabled = false;
            button.innerHTML = button === loginButton ? 'Đăng nhập' : 'Đăng ký';
        }
    }
});
