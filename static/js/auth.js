// auth.js - Xử lý đăng nhập và đăng ký với UI/UX cải tiến
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
    
    // Hiệu ứng lúc tải trang
    animateAuthCard();
    
    // Kiểm tra chế độ (sáng/tối)
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    }
    
    // Thêm hiệu ứng ripple cho các nút
    addRippleEffect(loginButton);
    addRippleEffect(registerButton);
    
    // Chuyển đổi giữa các tab với animation
    loginTab.addEventListener('click', function() {
        if (this.classList.contains('active')) return;
        
        animateTabTransition(loginTab, registerTab, loginForm, registerForm);
        clearErrors();
    });
    
    registerTab.addEventListener('click', function() {
        if (this.classList.contains('active')) return;
        
        animateTabTransition(registerTab, loginTab, registerForm, loginForm);
        clearErrors();
    });
    
    // Xử lý đăng nhập
    loginButton.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Xử lý đăng ký
    registerButton.addEventListener('click', function(e) {
        e.preventDefault();
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
    
    // Thêm hiệu ứng float label cho các input
    document.querySelectorAll('.form-group input').forEach(input => {
        // Thêm container cho input animation
        const parent = input.parentElement;
        const label = parent.querySelector('label');
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';
        
        // Move input into container
        parent.insertBefore(inputContainer, input);
        inputContainer.appendChild(input);
        
        // Add focus events
        input.addEventListener('focus', function() {
            inputContainer.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            inputContainer.classList.remove('focused');
            if (this.value) {
                inputContainer.classList.add('has-value');
            } else {
                inputContainer.classList.remove('has-value');
            }
        });
        
        // Check if input already has value
        if (input.value) {
            inputContainer.classList.add('has-value');
        }
    });
    
    // Hàm xử lý đăng nhập
    function handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        // Validate
        if (!username || !password) {
            showError(loginError, 'Vui lòng nhập tên đăng nhập và mật khẩu');
            shakeElement(loginError);
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
                shakeElement(loginError);
                setLoading(loginButton, false);
            } else {
                // Lưu token vào cookie
                const expires = new Date();
                expires.setDate(expires.getDate() + 1); // Hết hạn sau 1 ngày
                document.cookie = `token=${data.token}; expires=${expires.toUTCString()}; path=/`;
                
                // Hiệu ứng đăng nhập thành công
                loginButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Đăng nhập thành công
                `;
                
                // Hiệu ứng animateOut auth card
                const authCard = document.querySelector('.auth-card');
                authCard.style.transition = 'transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease';
                authCard.style.transform = 'translateY(-20px) scale(0.95)';
                authCard.style.opacity = '0';
                authCard.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
                
                // Chuyển hướng đến trang chat sau khi animation hoàn tất
                setTimeout(() => {
                    window.location.href = '/chat';
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showError(loginError, 'Đã xảy ra lỗi khi kết nối với server');
            shakeElement(loginError);
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
            shakeElement(registerError);
            return;
        }
        
        if (username.length < 3) {
            showError(registerError, 'Tên đăng nhập phải có ít nhất 3 ký tự');
            shakeElement(registerError);
            return;
        }
        
        if (password.length < 6) {
            showError(registerError, 'Mật khẩu phải có ít nhất 6 ký tự');
            shakeElement(registerError);
            return;
        }
        
        if (password !== confirm) {
            showError(registerError, 'Xác nhận mật khẩu không khớp');
            shakeElement(registerError);
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
                shakeElement(registerError);
                setLoading(registerButton, false);
            } else {
                // Lưu token vào cookie
                const expires = new Date();
                expires.setDate(expires.getDate() + 1); // Hết hạn sau 1 ngày
                document.cookie = `token=${data.token}; expires=${expires.toUTCString()}; path=/`;
                
                // Hiệu ứng đăng ký thành công
                registerButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Đăng ký thành công
                `;
                
                // Hiệu ứng animateOut auth card
                const authCard = document.querySelector('.auth-card');
                authCard.style.transition = 'transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease';
                authCard.style.transform = 'translateY(-20px) scale(0.95)';
                authCard.style.opacity = '0';
                authCard.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
                
                // Chuyển hướng đến trang chat sau khi animation hoàn tất
                setTimeout(() => {
                    window.location.href = '/chat';
                }, 1000);
            }
        })
        .catch(error => {
            console.error('Register error:', error);
            showError(registerError, 'Đã xảy ra lỗi khi kết nối với server');
            shakeElement(registerError);
            setLoading(registerButton, false);
        });
    }
    
    // Hàm hiệu ứng animation cho auth card
    function animateAuthCard() {
        const authCard = document.querySelector('.auth-card');
        authCard.style.opacity = '0';
        authCard.style.transform = 'translateY(20px) scale(0.95)';
        
        setTimeout(() => {
            authCard.style.transition = 'transform 0.5s ease, opacity 0.5s ease, box-shadow 0.3s ease';
            authCard.style.transform = 'translateY(0) scale(1)';
            authCard.style.opacity = '1';
        }, 200);
    }
    
    // Hàm chuyển đổi tab với animation
    function animateTabTransition(activeTab, inactiveTab, activeForm, inactiveForm) {
        // Highlight tab
        activeTab.classList.add('active');
        inactiveTab.classList.remove('active');
        
        // Hide current form with fade out
        inactiveForm.style.animation = 'fadeOut 0.3s forwards';
        
        // Show new form with fade in after delay
        setTimeout(() => {
            inactiveForm.classList.remove('active');
            activeForm.classList.add('active');
            activeForm.style.animation = 'fadeIn 0.3s forwards';
        }, 300);
    }
    
    // Hàm hiển thị error với animation
    function showError(element, message) {
        element.textContent = message;
        element.classList.add('active');
        element.style.animation = 'fadeIn 0.3s forwards';
    }
    
    // Hàm tạo hiệu ứng shake cho element
    function shakeElement(element) {
        element.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
    
    // Hàm tạo hiệu ứng ripple cho button
    function addRippleEffect(button) {
        button.classList.add('ripple-btn');
        
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }
    
    // Các utility functions
    function clearErrors() {
        loginError.textContent = '';
        loginError.classList.remove('active');
        registerError.textContent = '';
        registerError.classList.remove('active');
    }
    
    function setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `
                <div class="loading-spinner"></div>
                <span>${button === loginButton ? 'Đang đăng nhập...' : 'Đang đăng ký...'}</span>
            `;
        } else {
            button.disabled = false;
            button.innerHTML = button === loginButton ? 'Đăng nhập' : 'Đăng ký';
        }
    }
    
    // Thêm CSS cho animations
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
        
        @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
        }
        
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .ripple-btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple-effect {
            position: absolute;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.3);
            width: 100px;
            height: 100px;
            margin-top: -50px;
            margin-left: -50px;
            animation: ripple 0.6s linear;
            transform: scale(0);
            pointer-events: none;
        }
        
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .input-container {
            position: relative;
            margin-bottom: 24px;
        }
        
        .input-container label {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            background-color: var(--card-bg);
            padding: 0 5px;
            font-size: 15px;
            color: var(--text-muted);
            pointer-events: none;
            transition: all 0.3s ease;
        }
        
        .input-container.focused label, .input-container.has-value label {
            top: 0;
            transform: translateY(-50%);
            font-size: 12px;
            color: var(--primary-color);
        }
        
        .input-container input {
            height: 56px;
            padding: 0 16px;
            font-size: 16px;
        }
        
        .input-container.focused input {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
    `;
    
    document.head.appendChild(styleElement);
});