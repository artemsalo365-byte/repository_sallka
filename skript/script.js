// Основной JavaScript для фитнес-клуба
// Добавляем в начало файла

const API_BASE_URL = (window.location.origin || 'http://localhost:5000') + '/api';

// Обновляем функцию initForms для работы с API
function initForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const contactForm = document.getElementById('contactForm');
    
    // Проверка пароля при регистрации: 8+ символов, заглавная, цифра, спецсимвол
    function validateRegisterPassword(pwd) {
        if (!pwd || pwd.length < 8) return 'Пароль не менее 8 символов';
        if (!/[A-Z]/.test(pwd)) return 'Нужна хотя бы одна заглавная буква';
        if (!/[0-9]/.test(pwd)) return 'Нужна хотя бы одна цифра';
        if (!/[!@#$%^&*()_+\-=[\]{}|;':",./<>?`~]/.test(pwd)) return 'Нужен хотя бы один спецсимвол (!@#$%^&* и т.д.)';
        return null;
    }

    // Форма регистрации (модальное окно на главной)
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var pwd = document.getElementById('password');
            var confirmPwd = document.getElementById('confirmPassword');
            var pwdValue = (pwd && pwd.value) ? pwd.value : '';
            var err = validateRegisterPassword(pwdValue);
            if (err) {
                alert(err);
                return;
            }
            if (pwd && confirmPwd && pwd.value !== confirmPwd.value) {
                alert('Пароли не совпадают');
                return;
            }
            var firstName = (document.getElementById('regModalFirstName') || registerForm.querySelector('input[name="first_name"], input[placeholder="Имя"]'));
            var lastName = (document.getElementById('regModalLastName') || registerForm.querySelector('input[name="last_name"], input[placeholder="Фамилия"]'));
            var emailEl = document.getElementById('regModalEmail') || registerForm.querySelector('input[type="email"]');
            var phoneEl = document.getElementById('regModalPhone') || registerForm.querySelector('input[type="tel"]');
            var formData = {
                first_name: (firstName && firstName.value) ? firstName.value.trim() : '',
                last_name: (lastName && lastName.value) ? lastName.value.trim() : '',
                email: emailEl ? emailEl.value.trim() : '',
                password: (pwd || registerForm.querySelector('input[type="password"]')).value,
                phone: (phoneEl && phoneEl.value) ? phoneEl.value.trim() : ''
            };
            if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
                alert('Заполните имя, фамилию, email и пароль');
                return;
            }
            try {
                var response = await fetch(API_BASE_URL + '/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                var data = await response.json();
                if (response.ok) {
                    alert('Регистрация успешна! Теперь вы можете войти.');
                    var regModal = document.getElementById('registerModal');
                    if (regModal) {
                        regModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                    registerForm.reset();
                    updateHeroStats();
                } else {
                    alert('Ошибка: ' + (data.error || 'Попробуйте снова'));
                }
            } catch (error) {
                alert('Ошибка сети: ' + error.message);
            }
        });
    }
    
    // Форма входа (модальное окно на главной)
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var emailEl = document.getElementById('loginModalEmail') || loginForm.querySelector('input[type="email"]');
            var passwordEl = document.getElementById('loginModalPassword') || loginForm.querySelector('input[type="password"]');
            var rememberEl = loginForm.querySelector('input[type="checkbox"]');
            var email = (emailEl && emailEl.value) ? emailEl.value.trim().toLowerCase() : '';
            var password = (passwordEl && passwordEl.value) ? passwordEl.value : '';
            if (!email) {
                alert('Введите email');
                return;
            }
            if (!password) {
                alert('Введите пароль');
                return;
            }
            var formData = {
                email: email,
                password: password,
                remember: rememberEl ? rememberEl.checked : false
            };
            try {
                var response = await fetch(API_BASE_URL + '/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });
                var data = await response.json();
                if (response.ok) {
                    alert('Вход выполнен успешно!');
                    var loginModal = document.getElementById('loginModal');
                    if (loginModal) {
                        loginModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                    loginForm.reset();
                    updateAuthUI();
                } else {
                    var err = (data.error || '').replace('Invalid email or password', 'Неверный email или пароль');
                    alert(err ? 'Ошибка: ' + err : 'Неверный email или пароль. Проверьте данные или зарегистрируйтесь.');
                }
            } catch (error) {
                alert('Ошибка сети. Проверьте подключение.');
            }
        });
    }
    
    // Добавляем функцию для покупки абонемента
    initSubscriptionButtons();
}

// Функция для кнопок покупки абонемента
function initSubscriptionButtons() {
    document.querySelectorAll('.register-btn').forEach(btn => {
        var text = btn.textContent || '';
        if (text.indexOf('абонемент') !== -1 || text.indexOf('Записаться') !== -1) {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                var card = this.closest('.price-card');
                if (!card) return;
                var planName = (card.querySelector('h3') || {}).textContent || '';
                try {
                    var typesRes = await fetch(API_BASE_URL + '/subscription-types', { credentials: 'include' });
                    var types = await typesRes.json();
                    var subscriptionType = types.find(function(s) { return s.name === planName; });
                    if (!subscriptionType) {
                        subscriptionType = types[0];
                    }
                    var userRes = await fetch(API_BASE_URL + '/profile', { credentials: 'include' });
                    if (userRes.ok) {
                        window.location.href = 'subscription.html?type_id=' + subscriptionType.id;
                    } else {
                        var regModal = document.getElementById('registerModal');
                        var loginModal = document.getElementById('loginModal');
                        if (loginModal) {
                            loginModal.classList.add('active');
                            document.body.style.overflow = 'hidden';
                        } else if (regModal) {
                            regModal.classList.add('active');
                            document.body.style.overflow = 'hidden';
                        } else {
                            window.location.href = 'sait.html#login';
                        }
                    }
                } catch (err) {
                    console.error(err);
                    window.location.href = 'subscription.html';
                }
            });
        }
    });
}

// Функция обновления UI после авторизации (шапка главной)
async function updateAuthUI() {
    var navAuth = document.querySelector('.nav-auth');
    if (!navAuth) return;
    try {
        var response = await fetch(API_BASE_URL + '/profile', { credentials: 'include' });
        if (response.ok) {
            var user = await response.json();
            navAuth.classList.add('user-logged-in');
            navAuth.innerHTML =
                '<a href="profile.html" class="nav-icon-btn nav-icon-btn-primary" title="Профиль"><i class="fas fa-user"></i></a>' +
                '<a href="subscription.html" class="nav-icon-btn nav-icon-btn-outline" title="Абонементы"><i class="fas fa-id-card"></i></a>' +
                '<button type="button" class="nav-icon-btn nav-icon-btn-outline logout-btn" title="Выйти"><i class="fas fa-right-from-bracket"></i></button>';
            var logoutBtn = navAuth.querySelector('.logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', function() {
                    fetch(API_BASE_URL + '/logout', { method: 'POST', credentials: 'include' }).then(function() {
                        location.reload();
                    });
                });
            }
        } else {
            navAuth.classList.remove('user-logged-in');
            navAuth.innerHTML = '<button type="button" class="btn btn-outline login-btn">Войти</button>' +
                '<button type="button" class="btn btn-primary register-btn">Регистрация</button>';
            initModalWindows();
        }
    } catch (error) {
        navAuth.classList.remove('user-logged-in');
        navAuth.innerHTML = '<button type="button" class="btn btn-outline login-btn">Войти</button>' +
            '<button type="button" class="btn btn-primary register-btn">Регистрация</button>';
        if (typeof initModalWindows === 'function') initModalWindows();
    }
}

function initShowPassword() {
    document.querySelectorAll('.show-password').forEach(function(btn) {
        if (btn._passwordBound) return;
        btn._passwordBound = true;
        var isRegPair = btn.classList.contains('show-password-reg');
        btn.addEventListener('click', function() {
            var inputs = [];
            if (isRegPair) {
                var pwd = document.getElementById('password');
                var conf = document.getElementById('confirmPassword');
                if (pwd) inputs.push(pwd);
                if (conf) inputs.push(conf);
            } else {
                var wrap = btn.closest('.input-with-icon');
                var row = btn.closest('.password-input-row');
                var input = wrap ? wrap.querySelector('input[type="password"], input[type="text"]') : (row ? row.querySelector('.input-with-icon input') : null);
                if (input) inputs.push(input);
            }
            if (inputs.length === 0) return;
            var show = inputs[0].type === 'password';
            var icon = btn.querySelector('i');
            inputs.forEach(function(input) {
                input.type = show ? 'text' : 'password';
            });
            if (icon) {
                if (show) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
                else { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initShowPassword();
    updateHeroStats();
    initNavbar();
    initCounterAnimation();
    initModalWindows();
    initForms();
    initContactAndSocial();
    initAnimations();
    updateAuthUI();
    openModalFromHash();
});

function openModalFromHash() {
    var hash = (window.location.hash || '').toLowerCase();
    var loginModal = document.getElementById('loginModal');
    var registerModal = document.getElementById('registerModal');
    if (hash === '#login' && loginModal) {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        history.replaceState(null, '', window.location.pathname);
    } else if ((hash === '#register' || hash === '#reg') && registerModal) {
        registerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        history.replaceState(null, '', window.location.pathname);
    }
}

// Навигация при скролле
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = 'rgba(10, 10, 10, 0.98)';
            navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.backgroundColor = 'rgba(10, 10, 10, 0.95)';
            navbar.style.boxShadow = 'none';
        }
        
        // Активная секция в навигации
        let current = '';
        const sections = document.querySelectorAll('section');
        
        sections.forEach(function(section) {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
    
    // Плавная прокрутка
    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function animateValue(el, start, end, duration) {
    if (start === end) { el.textContent = end; return; }
    var startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var current = Math.floor(start + (end - start) * progress);
        el.textContent = current;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = end;
    }
    requestAnimationFrame(step);
}

function updateHeroStats() {
    var clientsEl = document.getElementById('statClients');
    var trainersEl = document.getElementById('statTrainers');
    var clients = 1500;
    var trainers = 26;
    if (clientsEl) {
        clientsEl.setAttribute('data-count', clients);
        clientsEl.textContent = '0';
        animateValue(clientsEl, 0, clients, 1800);
    }
    if (trainersEl) {
        trainersEl.setAttribute('data-count', trainers);
        trainersEl.textContent = '0';
        animateValue(trainersEl, 0, trainers, 1800);
    }
}

// Анимация счетчиков при прокрутке (с 0 до значения из data-count)
function initCounterAnimation() {
    var counters = document.querySelectorAll('.stat-number');
    if (!counters.length) return;
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var counter = entry.target;
                var target = parseInt(counter.getAttribute('data-count'), 10) || 0;
                var current = parseInt(counter.textContent, 10) || 0;
                counter.textContent = '0';
                if (target > 0) animateValue(counter, 0, target, 2000);
                else counter.textContent = '0';
                observer.unobserve(counter);
            }
        });
    }, { threshold: 0.3 });
    counters.forEach(function(c) { observer.observe(c); });
}

// Модальные окна
function initModalWindows() {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtns = document.querySelectorAll('.login-btn');
    const registerBtns = document.querySelectorAll('.register-btn');
    const closeBtns = document.querySelectorAll('.modal-close');
    const switchToRegister = document.querySelector('.switch-to-register');
    const switchToLogin = document.querySelector('.switch-to-login');
    
    if (!loginModal || !registerModal) return;
    // Кнопка "Начать тренироваться": если залогинен — переход на абонементы, иначе — регистрация
    registerBtns.forEach(function(btn) {
        var text = (btn.textContent || '').trim();
        if (text.indexOf('Начать тренироваться') !== -1) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                fetch(API_BASE_URL + '/profile', { credentials: 'include' })
                    .then(function(r) {
                        if (r.ok) {
                            window.location.href = 'subscription.html';
                            return;
                        }
                        registerModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    })
                    .catch(function() {
                        registerModal.classList.add('active');
                        document.body.style.overflow = 'hidden';
                    });
            });
            return;
        }
    });
    // Открытие модальных окон
    loginBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            loginModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
    
    registerBtns.forEach(function(btn) {
        var text = (btn.textContent || '').trim();
        if (text.indexOf('Начать тренироваться') !== -1) return; // уже обработано выше
        btn.addEventListener('click', function() {
            registerModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
    
    // Закрытие модальных окон
    closeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            loginModal.classList.remove('active');
            registerModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
    
    // Закрытие по клику на оверлей
    [loginModal, registerModal].forEach(function(modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    // Переключение между окнами
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.classList.remove('active');
            registerModal.classList.add('active');
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            registerModal.classList.remove('active');
            loginModal.classList.add('active');
        });
    }
    
    // Индикатор сложности пароля
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthBar) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            
            // Проверка условий
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^A-Za-z0-9]/.test(password)) strength++;
            
            // Обновление индикатора
            const width = strength * 25;
            strengthBar.style.width = width + '%';
            
            const colors = ['#ff5252', '#ff9800', '#4caf50', '#2e7d32'];
            const texts = ['Слабый', 'Средний', 'Хороший', 'Отличный'];
            
            strengthBar.style.backgroundColor = colors[strength] || '#ff5252';
            if (strengthText) {
                strengthText.textContent = texts[strength] || 'Слабый';
            }
        });
    }
}

// Форма контактов (только на главной)
function initContactAndSocial() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
            setTimeout(function() {
                alert('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                contactForm.reset();
            }, 1500);
        });
    }
}

// Анимации
function initAnimations() {
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-visible');
            }
        });
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.section-header').forEach(function(el) {
        el.classList.add('animate-block');
        observer.observe(el);
    });

    var cardSelectors = '.service-card, .price-card, .team-card, .testimonial-card';
    document.querySelectorAll(cardSelectors).forEach(function(el, index) {
        el.classList.add('animate-inner');
        el.style.animationDelay = (index % 8) * 0.08 + 's';
        observer.observe(el);
    });

    document.querySelectorAll('.philosophy-text, .philosophy-image, .contact-info, .contact-form').forEach(function(el) {
        el.classList.add('animate-inner');
        observer.observe(el);
    });
}

// Забыли пароль — открыть модальное окно восстановления
document.addEventListener('DOMContentLoaded', function() {
    var forgotLinks = document.querySelectorAll('.forgot-password');
    var recoveryModal = document.getElementById('recoveryModal');
    var loginModal = document.getElementById('loginModal');
    forgotLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginModal) loginModal.classList.remove('active');
            if (recoveryModal) {
                recoveryModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    if (recoveryModal) {
        recoveryModal.querySelectorAll('.modal-close, .close-recovery').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                recoveryModal.classList.remove('active');
                document.body.style.overflow = 'auto';
                if (loginModal) loginModal.classList.add('active');
            });
        });
        recoveryModal.addEventListener('click', function(e) {
            if (e.target === recoveryModal) {
                recoveryModal.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }
    var recoveryForm = document.getElementById('recoveryForm');
    if (recoveryForm) {
        recoveryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var emailInput = recoveryForm.querySelector('input[type="email"]');
            var email = emailInput ? emailInput.value.trim() : '';
            if (!email) return;
            var btn = recoveryForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
            fetch(API_BASE_URL + '/password/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    alert(data.message + (data.reset_link ? '\n\nСсылка для сброса: ' + data.reset_link : ''));
                    if (recoveryModal) {
                        recoveryModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                    recoveryForm.reset();
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить ссылку';
                })
                .catch(function() {
                    alert('Ошибка сети');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Отправить ссылку';
                });
        });
    }
});

// Кнопка "Посмотреть расписание" в футере
const scheduleBtn = document.querySelector('.schedule-btn');
if (scheduleBtn) {
    scheduleBtn.addEventListener('click', function() {
        window.scrollTo({
            top: document.getElementById('schedule').offsetTop - 80,
            behavior: 'smooth'
        });
    });
}