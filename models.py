from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    password_reset_token = db.Column(db.String(100), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)
    
    # Связи
    subscriptions = db.relationship('Subscription', backref='user', lazy=True)
    payments = db.relationship('Payment', backref='user', lazy=True)
    saved_cards = db.relationship('UserCard', backref='user', lazy=True)

class SubscriptionType(db.Model):
    __tablename__ = 'subscription_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Базовый, Премиум, Персональный
    price = db.Column(db.Integer, nullable=False)  # в копейках
    duration_days = db.Column(db.Integer, nullable=False)  # 30, 90, 365 дней
    description = db.Column(db.Text)
    features = db.Column(db.JSON)  # JSON с преимуществами
    is_active = db.Column(db.Boolean, default=True)
    
    # Связи
    subscriptions = db.relationship('Subscription', backref='subscription_type', lazy=True)

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subscription_type_id = db.Column(db.Integer, db.ForeignKey('subscription_types.id'), nullable=False)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, expired, cancelled
    auto_renewal = db.Column(db.Boolean, default=True)
    
    # Метод для проверки активности
    def is_active(self):
        return self.status == 'active' and self.end_date > datetime.utcnow()

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id'), nullable=True)
    amount = db.Column(db.Integer, nullable=False)  # в копейках
    currency = db.Column(db.String(3), default='RUB')
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed, refunded
    payment_method = db.Column(db.String(50))  # card, sber, yoomoney, etc.
    payment_system_id = db.Column(db.String(100))  # ID платежа в платежной системе
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime, nullable=True)

    # Связи
    subscription = db.relationship('Subscription', backref='payments')


class UserCard(db.Model):
    """Привязанная карта пользователя (только маска и последние 4 цифры, без полного номера и CVC)."""
    __tablename__ = 'user_cards'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    masked_number = db.Column(db.String(30), nullable=False)  # **** **** **** 1234
    last4 = db.Column(db.String(4), nullable=False)
    brand = db.Column(db.String(20), nullable=True)  # visa, mastercard
    expiry_month = db.Column(db.Integer, nullable=True)  # 1-12
    expiry_year = db.Column(db.Integer, nullable=True)   # 2025
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Training(db.Model):
    __tablename__ = 'trainings'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    trainer_id = db.Column(db.Integer, db.ForeignKey('trainers.id'), nullable=True)
    day_of_week = db.Column(db.Integer)  # 0-6 (понедельник-воскресенье)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    max_participants = db.Column(db.Integer)
    current_participants = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

class Trainer(db.Model):
    __tablename__ = 'trainers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialization = db.Column(db.String(100))
    experience = db.Column(db.Integer)  # опыт в годах
    bio = db.Column(db.Text)
    photo_url = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)
    
    # Связи
    trainings = db.relationship('Training', backref='trainer', lazy=True)