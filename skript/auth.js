// auth.js - Обработка страниц авторизации и регистрации

const API_BASE_URL = (window.location.origin || 'http://localhost:5000') + '/api';

document.addEventListener('DOMContentLoaded', function() {
    initAuthPages();
    initPasswordToggle();
    initPasswordValidation();
    initForms();
    checkAuthStatus();
});

function initAuthPages() {
    // Подсветка активной ссылки в навигации
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.auth-nav-links .nav-link');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function initPasswordToggle() {
    // Показ/скрытие пароля
    const showPasswordBtns = document.querySelectorAll('.show-password');
    
    showPasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

function initPasswordValidation() {
    const passwordInput = document.getElementById('regPassword');
    const confirmInput = document.getElementById('confirmPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    const matchIndicator = document.querySelector('.password-match');
    
    if (!passwordInput || !confirmInput) return;
    
    // Проверка сложности пароля
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        
        // Проверка условий
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Обновление индикатора
        if (strengthBar) {
            const width = strength * 25;
            strengthBar.style.setProperty('--width', width + '%');
            
            const colors = ['#ff5252', '#ff9800', '#4caf50', '#2e7d32'];
            const texts = ['Слабый', 'Средний', 'Хороший', 'Отличный'];
            
            if (strengthText) {
                strengthText.textContent = texts[strength] || 'Слабый';
                strengthText.style.color = colors[strength] || '#ff5252';
            }
        }
        
        // Проверка совпадения паролей
        if (confirmInput.value) {
            checkPasswordMatch();
        }
    });
    
    // Проверка совпадения паролей
    confirmInput.addEventListener('input', checkPasswordMatch);
    
    function checkPasswordMatch() {
        if (!matchIndicator) return;
        
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (confirm === '') {
            matchIndicator.textContent = '';
            matchIndicator.className = 'password-match';
            return;
        }
        
        if (password === confirm) {
            matchIndicator.textContent = '✓ Пароли совпадают';
            matchIndicator.classList.add('valid');
            matchIndicator.classList.remove('invalid');
        } else {
            matchIndicator.textContent = '✗ Пароли не совпадают';
            matchIndicator.classList.add('invalid');
            matchIndicator.classList.remove('valid');
        }
    }
}

function initForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const recoveryForm = document.getElementById('recoveryForm');
    const forgotPasswordLink = document.querySelector('.forgot-password');
    
    // Форма входа
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            // Показываем индикатор загрузки
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
            submitBtn.disabled = true;
            
            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                remember: document.getElementById('remember')?.checked || false
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Сохраняем информацию о пользователе
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Показываем сообщение об успехе
                    showNotification('Успешный вход! Перенаправление...', 'success');
                    
                    // Перенаправляем на главную
                    setTimeout(() => {
                        window.location.href = 'sait.html';
                    }, 1000);
                } else {
                    showNotification('Ошибка: ' + data.error, 'error');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showNotification('Ошибка сети: ' + error.message, 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Форма регистрации
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Проверка паролей
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password.length < 8) {
                showNotification('Пароль не менее 8 символов', 'error');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                showNotification('Нужна хотя бы одна заглавная буква', 'error');
                return;
            }
            if (!/[0-9]/.test(password)) {
                showNotification('Нужна хотя бы одна цифра', 'error');
                return;
            }
            if (!/[!@#$%^&*()_+\-=[\]{}|;':",./<>?`~]/.test(password)) {
                showNotification('Нужен хотя бы один спецсимвол (!@#$%^&* и т.д.)', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification('Пароли не совпадают!', 'error');
                return;
            }
            
            if (!document.getElementById('terms').checked) {
                showNotification('Необходимо согласиться с правилами клуба', 'error');
                return;
            }
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
            submitBtn.disabled = true;
            
            const formData = {
                email: document.getElementById('regEmail').value,
                password: password,
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                phone: document.getElementById('phone').value
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Показываем модальное окно успеха
                    const successModal = document.getElementById('successModal');
                    if (successModal) {
                        successModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                        
                        // Закрытие модального окна
                        const closeModal = () => {
                            successModal.classList.remove('active');
                            document.body.style.overflow = 'auto';
                        };
                        
                        successModal.querySelector('.modal-close').addEventListener('click', closeModal);
                        
                        successModal.addEventListener('click', function(e) {
                            if (e.target === successModal) {
                                closeModal();
                            }
                        });
                    } else {
                        showNotification('Регистрация успешна! Теперь вы можете войти.', 'success');
                        setTimeout(() => {
                            window.location.href = 'auth.html';
                        }, 1500);
                    }
                } else {
                    showNotification('Ошибка: ' + data.error, 'error');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showNotification('Ошибка сети: ' + error.message, 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Восстановление пароля
    if (forgotPasswordLink && document.getElementById('recoveryModal')) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            const recoveryModal = document.getElementById('recoveryModal');
            recoveryModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Закрытие модального окна
            const closeBtn = recoveryModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    recoveryModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
            }
            
            // Переключение на вход
            const switchToLogin = recoveryModal.querySelector('.switch-to-login');
            if (switchToLogin) {
                switchToLogin.addEventListener('click', function(e) {
                    e.preventDefault();
                    recoveryModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
            }
            
            // Закрытие по клику на оверлей
            recoveryModal.addEventListener('click', function(e) {
                if (e.target === recoveryModal) {
                    recoveryModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                }
            });
        });
    }
    
    // Форма восстановления пароля
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var emailInput = recoveryForm.querySelector('input[type="email"]');
            var email = emailInput ? emailInput.value.trim() : '';
            if (!email) {
                showNotification('Введите email', 'error');
                return;
            }
            var submitBtn = recoveryForm.querySelector('button[type="submit"]');
            var originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            submitBtn.disabled = true;
            fetch(API_BASE_URL + '/password/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    showNotification(data.message || 'Готово', 'success');
                    if (data.reset_link) {
                        showNotification('Ссылка для сброса (скопируйте): ' + data.reset_link, 'info');
                    }
                    var modal = document.getElementById('recoveryModal');
                    if (modal) { modal.classList.remove('active'); document.body.style.overflow = 'auto'; }
                    recoveryForm.reset();
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                })
                .catch(function() {
                    showNotification('Ошибка сети', 'error');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                });
        });
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            
            // Если пользователь на странице входа/регистрации, перенаправляем на главную
            const currentPath = window.location.pathname.split('/').pop();
            if (currentPath === 'auth.html' || currentPath === 'reg.html') {
                window.location.href = 'sait.html';
            }
        } else {
            localStorage.removeItem('user');
        }
    } catch (error) {
        console.log('Неавторизованный пользователь');
        localStorage.removeItem('user');
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    // Создаем элемент уведомления, если его нет
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Функция выхода
async function logout() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Экспортируем функцию для использования в других файлах
window.logout = logout;