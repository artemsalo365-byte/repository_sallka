from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
import os as _os
try:
    from dotenv import load_dotenv
    _project_dir = _os.path.dirname(_os.path.abspath(__file__))
    load_dotenv(_os.path.join(_project_dir, '.env'))
except ImportError:
    pass
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import json
import uuid
import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from models import db, User, SubscriptionType, Subscription, Payment, Trainer, Training, UserCard
from db import init_db

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, supports_credentials=True, origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:5500", "http://127.0.0.1:5500"])

# Конфигурация
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fitness.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # True для HTTPS в продакшене
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=30)

# Почта для восстановления пароля (из .env или переменных окружения)
app.config['MAIL_SERVER'] = (os.environ.get('MAIL_SERVER') or '').strip()
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587') or '587')
app.config['MAIL_USERNAME'] = (os.environ.get('MAIL_USERNAME') or '').strip()
app.config['MAIL_PASSWORD'] = (os.environ.get('MAIL_PASSWORD') or '').strip()
app.config['MAIL_USE_TLS'] = (os.environ.get('MAIL_USE_TLS') or '1').lower() in ('1', 'true', 'yes')
app.config['MAIL_FROM'] = (os.environ.get('MAIL_FROM') or '').strip() or app.config['MAIL_USERNAME']

def mail_configured():
    return bool(app.config.get('MAIL_SERVER') and app.config.get('MAIL_USERNAME') and app.config.get('MAIL_PASSWORD'))

# Инициализация
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Инициализация БД
init_db(app)

# ==================== Статические файлы ====================

def send_html(name):
    return send_from_directory('html', name)

@app.route('/')
def index():
    return send_html('sait.html')

@app.route('/sait.html')
def main_page():
    return send_html('sait.html')

@app.route('/auth.html')
def auth_page():
    return send_html('auth.html')

@app.route('/reg.html')
def reg_page():
    return send_html('reg.html')

@app.route('/subscription.html')
def subscription_page():
    return send_html('subscription.html')

@app.route('/profile.html')
def profile_page():
    return send_html('profile.html')

@app.route('/stuly.css')
def css():
    return send_from_directory('html', 'stuly.css')

@app.route('/script.js')
def script_js():
    return send_from_directory('skript', 'script.js')

@app.route('/auth.js')
def auth_js():
    return send_from_directory('skript', 'auth.js')

@app.route('/reset-password.html')
def reset_password_page():
    return send_html('reset-password.html')

@app.route('/image/<path:filename>')
def serve_image(filename):
    return send_from_directory('image', filename)

@app.route('/<path:path>')
def static_files(path):
    if path.startswith('api/'):
        return send_html('sait.html')
    if path.startswith('html/'):
        return send_from_directory('.', path)
    if path.startswith('skript/'):
        return send_from_directory('.', path)
    return send_html('sait.html')

# ==================== API Endpoints ====================

@app.route('/api/stats')
def stats():
    """Статистика для главной: число клиентов и тренеров"""
    return jsonify({
        'total_users': User.query.count(),
        'total_trainers': Trainer.query.filter_by(is_active=True).count()
    }), 200

def validate_password(password):
    """Пароль: минимум 8 символов, заглавная буква, цифра, спецсимвол."""
    if not password or len(password) < 8:
        return False, 'Пароль не менее 8 символов'
    if not any(c.isupper() for c in password):
        return False, 'Нужна хотя бы одна заглавная буква'
    if not any(c.isdigit() for c in password):
        return False, 'Нужна хотя бы одна цифра'
    if not any(c in '!@#$%^&*()_+-=[]{}|;\':",./<>?`~' for c in password):
        return False, 'Нужен хотя бы один спецсимвол (!@#$%^&* и т.д.)'
    return True, None

@app.route('/api/register', methods=['POST'])
def register():
    """Регистрация пользователя"""
    try:
        data = request.get_json()
        
        # Проверка обязательных полей
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing {field}'}), 400
        
        # Проверка пароля
        ok, err = validate_password(data.get('password', ''))
        if not ok:
            return jsonify({'error': err}), 400
        
        # Проверка уникальности email
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        # Создание пользователя
        user = User(
            email=data['email'],
            password=generate_password_hash(data['password']),
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data.get('phone', '')
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Вход пользователя"""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Missing email or password'}), 400
        
        email = (data.get('email') or '').strip().lower()
        if not email:
            return jsonify({'error': 'Введите email'}), 400
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password, (data.get('password') or '').strip()):
            login_user(user, remember=data.get('remember', False))
            
            return jsonify({
                'message': 'Вход выполнен',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }), 200
        else:
            return jsonify({'error': 'Неверный email или пароль'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Выход пользователя"""
    logout_user()
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/profile')
def profile():
    """Профиль текущего пользователя (проверка сессии)"""
    if current_user.is_authenticated:
        return jsonify({
            'id': current_user.id,
            'email': current_user.email,
            'first_name': current_user.first_name,
            'last_name': current_user.last_name,
            'phone': current_user.phone or ''
        }), 200
    return jsonify({'error': 'Not authenticated'}), 401

@app.route('/api/profile/full')
@login_required
def profile_full():
    """Профиль с данными и активным абонементом"""
    active = Subscription.query.filter(
        Subscription.user_id == current_user.id,
        Subscription.status == 'active',
        Subscription.end_date > datetime.utcnow()
    ).order_by(Subscription.end_date.desc()).first()
    sub_data = None
    if active:
        st = active.subscription_type
        sub_data = {
            'id': active.id,
            'subscription_type_name': st.name,
            'start_date': active.start_date.strftime('%d.%m.%Y'),
            'end_date': active.end_date.strftime('%d.%m.%Y'),
            'status': active.status,
            'auto_renewal': active.auto_renewal
        }
    saved_card = None
    card = UserCard.query.filter_by(user_id=current_user.id).order_by(UserCard.created_at.desc()).first()
    if card:
        saved_card = {
            'id': card.id,
            'masked_number': card.masked_number,
            'last4': card.last4,
            'brand': card.brand or 'card',
            'expiry_month': card.expiry_month,
            'expiry_year': card.expiry_year
        }
    return jsonify({
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'first_name': current_user.first_name,
            'last_name': current_user.last_name,
            'phone': current_user.phone or '',
            'created_at': current_user.created_at.strftime('%d.%m.%Y') if current_user.created_at else None
        },
        'active_subscription': sub_data,
        'saved_card': saved_card
    }), 200

@app.route('/api/profile', methods=['PATCH'])
@login_required
def profile_update():
    """Обновление данных профиля (имя, фамилия, телефон)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data'}), 400
        if 'first_name' in data and data['first_name']:
            current_user.first_name = data['first_name'].strip()[:50]
        if 'last_name' in data:
            current_user.last_name = (data['last_name'] or '').strip()[:50]
        if 'phone' in data:
            current_user.phone = (data['phone'] or '').strip()[:20]
        db.session.commit()
        return jsonify({
            'message': 'Profile updated',
            'user': {
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'phone': current_user.phone or ''
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/change-password', methods=['POST'])
@login_required
def profile_change_password():
    """Смена пароля (текущий + новый)"""
    try:
        data = request.get_json()
        current = data.get('current_password')
        new_pass = data.get('new_password')
        if not current or not new_pass:
            return jsonify({'error': 'current_password and new_password required'}), 400
        if not check_password_hash(current_user.password, current):
            return jsonify({'error': 'Неверный текущий пароль'}), 400
        if len(new_pass) < 6:
            return jsonify({'error': 'Новый пароль не менее 6 символов'}), 400
        current_user.password = generate_password_hash(new_pass)
        db.session.commit()
        return jsonify({'message': 'Password changed'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/card', methods=['POST'])
@login_required
def profile_save_card():
    """Сохранить привязанную карту (только маска: last4, masked_number, brand, expiry). Одна карта на пользователя — заменяет предыдущую."""
    try:
        data = request.get_json()
        if not data or not data.get('masked_number') or not data.get('last4'):
            return jsonify({'error': 'masked_number and last4 required'}), 400
        masked = (data.get('masked_number') or '').strip()[:30]
        last4 = (data.get('last4') or '').strip()[-4:]
        if len(last4) != 4 or not last4.isdigit():
            return jsonify({'error': 'last4 must be 4 digits'}), 400
        if not masked:
            masked = '**** **** **** ' + last4
        brand = (data.get('brand') or 'card').strip()[:20]
        expiry_month = data.get('expiry_month')
        expiry_year = data.get('expiry_year')
        if expiry_month is not None:
            try:
                m = int(expiry_month)
                expiry_month = m if 1 <= m <= 12 else None
            except (TypeError, ValueError):
                expiry_month = None
        if expiry_year is not None:
            try:
                expiry_year = int(expiry_year)
            except (TypeError, ValueError):
                expiry_year = None

        existing = UserCard.query.filter_by(user_id=current_user.id).first()
        if existing:
            existing.masked_number = masked
            existing.last4 = last4
            existing.brand = brand or None
            existing.expiry_month = expiry_month
            existing.expiry_year = expiry_year
            db.session.commit()
            return jsonify({'message': 'Card updated', 'card_id': existing.id}), 200
        card = UserCard(
            user_id=current_user.id,
            masked_number=masked,
            last4=last4,
            brand=brand or None,
            expiry_month=expiry_month,
            expiry_year=expiry_year
        )
        db.session.add(card)
        db.session.commit()
        return jsonify({'message': 'Card saved', 'card_id': card.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile/card', methods=['DELETE'])
@login_required
def profile_remove_card():
    """Отвязать карту от профиля."""
    n = UserCard.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({'message': 'Card removed', 'removed': n}), 200

@app.route('/api/subscription/<int:sub_id>/return', methods=['POST'])
@login_required
def subscription_return(sub_id):
    """Оформить возврат абонемента (отмена)"""
    sub = Subscription.query.filter_by(id=sub_id, user_id=current_user.id).first()
    if not sub:
        return jsonify({'error': 'Subscription not found'}), 404
    if sub.status != 'active':
        return jsonify({'error': 'Only active subscription can be returned'}), 400
    sub.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Return processed', 'subscription_id': sub.id}), 200

@app.route('/api/subscription-types')
def subscription_types():
    """Список типов абонементов"""
    types = SubscriptionType.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': t.id,
        'name': t.name,
        'price': t.price,
        'price_rub': t.price // 100,
        'duration_days': t.duration_days,
        'description': t.description,
        'features': t.features if isinstance(t.features, list) else (json.loads(t.features) if isinstance(t.features, str) else [])
    } for t in types]), 200

@app.route('/api/subscribe', methods=['POST'])
@login_required
def subscribe():
    """Оформление абонемента (создание подписки и платёж). Нельзя купить второй при активном."""
    try:
        active = Subscription.query.filter(
            Subscription.user_id == current_user.id,
            Subscription.status == 'active',
            Subscription.end_date > datetime.utcnow()
        ).first()
        if active:
            return jsonify({
                'error': 'У вас уже есть активный абонемент. Оформите возврат в профиле, чтобы купить новый.'
            }), 400
        data = request.get_json()
        subscription_type_id = data.get('subscription_type_id')
        auto_renewal = data.get('auto_renewal', True)
        if not subscription_type_id:
            return jsonify({'error': 'subscription_type_id required'}), 400
        sub_type = SubscriptionType.query.get(subscription_type_id)
        if not sub_type:
            return jsonify({'error': 'Subscription type not found'}), 404
        start = datetime.utcnow()
        end = start + timedelta(days=sub_type.duration_days)
        sub = Subscription(
            user_id=current_user.id,
            subscription_type_id=sub_type.id,
            start_date=start,
            end_date=end,
            status='active',
            auto_renewal=auto_renewal
        )
        db.session.add(sub)
        db.session.flush()
        payment = Payment(
            user_id=current_user.id,
            subscription_id=sub.id,
            amount=sub_type.price,
            currency='RUB',
            status='pending',
            payment_method='online'
        )
        db.session.add(payment)
        db.session.commit()
        return jsonify({
            'message': 'Subscription created',
            'subscription_id': sub.id,
            'payment_id': payment.id,
            'amount': sub_type.price,
            'amount_rub': sub_type.price // 100,
            'subscription_type': sub_type.name
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payment/confirm', methods=['POST'])
@login_required
def payment_confirm():
    """Подтверждение оплаты (имитация)"""
    try:
        data = request.get_json()
        payment_id = data.get('payment_id')
        if not payment_id:
            return jsonify({'error': 'payment_id required'}), 400
        payment = Payment.query.filter_by(id=payment_id, user_id=current_user.id).first()
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404
        payment.status = 'completed'
        payment.paid_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Payment completed', 'payment_id': payment.id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def send_password_reset_email(to_email, reset_link):
    """Отправка письма со ссылкой для сброса пароля. Возвращает True при успехе."""
    server = app.config.get('MAIL_SERVER')
    username = app.config.get('MAIL_USERNAME')
    password = app.config.get('MAIL_PASSWORD')
    if not server or not username or not password:
        return False
    from_addr = app.config.get('MAIL_FROM') or username
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'IRONFLOW — восстановление пароля'
    msg['From'] = from_addr
    msg['To'] = to_email
    text = 'Здравствуйте!\n\nВы запросили сброс пароля на сайте IRONFLOW.\nПерейдите по ссылке (действует 1 час):\n{}\n\nЕсли вы не запрашивали сброс, проигнорируйте это письмо.'.format(reset_link)
    html = '''<html><body style="font-family: sans-serif;">
    <p>Здравствуйте!</p>
    <p>Вы запросили сброс пароля на сайте <strong>IRONFLOW</strong>.</p>
    <p>Перейдите по ссылке (действует 1 час):<br>
    <a href="{}">{}</a></p>
    <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    </body></html>'''.format(reset_link, reset_link)
    msg.attach(MIMEText(text, 'plain', 'utf-8'))
    msg.attach(MIMEText(html, 'html', 'utf-8'))
    try:
        with smtplib.SMTP(server, app.config.get('MAIL_PORT', 587)) as s:
            if app.config.get('MAIL_USE_TLS'):
                s.starttls()
            s.login(username, password)
            s.sendmail(from_addr, [to_email], msg.as_string())
        return True
    except Exception:
        return False

@app.route('/api/password/forgot', methods=['POST'])
def password_forgot():
    """Запрос на восстановление пароля: создаётся токен, письмо отправляется на email если настроена почта"""
    try:
        data = request.get_json()
        email = (data or {}).get('email', '').strip().lower()
        if not email:
            return jsonify({'error': 'Введите email'}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({
                'message': 'Если аккаунт с таким email существует, на него будет отправлена ссылка. Проверьте почту.'
            }), 200
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(hours=1)
        user.password_reset_token = token
        user.password_reset_expires = expires
        db.session.commit()
        reset_link = request.host_url.rstrip('/') + '/reset-password.html?token=' + token
        email_sent = send_password_reset_email(email, reset_link)
        if email_sent:
            return jsonify({
                'message': 'На ваш email отправлена ссылка для сброса пароля. Проверьте почту (и папку «Спам»). Ссылка действительна 1 час.'
            }), 200
        return jsonify({
            'message': 'Ссылка для сброса пароля создана. Письмо на почту не отправлено (не настроена отправка). Используйте ссылку ниже один раз.',
            'reset_link': reset_link
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/password/reset', methods=['POST'])
def password_reset():
    """Сброс пароля по токену (из ссылки восстановления)"""
    try:
        data = request.get_json()
        token = (data or {}).get('token', '').strip()
        new_password = (data or {}).get('new_password', '')
        if not token or not new_password:
            return jsonify({'error': 'token and new_password required'}), 400
        if len(new_password) < 6:
            return jsonify({'error': 'Пароль не менее 6 символов'}), 400
        user = User.query.filter_by(password_reset_token=token).first()
        if not user or not user.password_reset_expires or user.password_reset_expires < datetime.utcnow():
            return jsonify({'error': 'Ссылка недействительна или истекла'}), 400
        user.password = generate_password_hash(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        db.session.commit()
        return jsonify({'message': 'Пароль успешно изменён. Можете войти с новым паролем.'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)