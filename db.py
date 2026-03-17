from models import db, User, SubscriptionType, Trainer, Training
from werkzeug.security import generate_password_hash
import json

def init_db(app):
    """Инициализация базы данных"""
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        _add_password_reset_columns()
        seed_data()

def _add_password_reset_columns():
    """Добавить колонки для восстановления пароля, если их ещё нет"""
    from sqlalchemy import text
    for col, sql_type in [("password_reset_token", "VARCHAR(100)"), ("password_reset_expires", "DATETIME")]:
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN {} {}".format(col, sql_type)))
                conn.commit()
        except Exception:
            pass

def seed_data():
    """Наполнение начальными данными"""
    # Проверяем, есть ли уже данные
    if SubscriptionType.query.count() == 0:
        # Создаем типы абонементов
        subscription_types = [
            SubscriptionType(
                name='Базовый',
                price=150000,  # в копейках (1500 рублей)
                duration_days=30,
                description='Доступ к основным зонам, групповые занятия',
                features=json.dumps([
                    'Доступ к основным зонам',
                    'Групповые занятия',
                    'Раздевалка и душ'
                ])
            ),
            SubscriptionType(
                name='Премиум',
                price=250000,  # 2500 рублей
                duration_days=30,
                description='Полный доступ ко всем зонам и занятиям',
                features=json.dumps([
                    'Все зоны без ограничений',
                    'Все групповые занятия',
                    'Персональная программа',
                    'SPA и сауна',
                    'Скидка 10% на услуги'
                ])
            ),
            SubscriptionType(
                name='Персональный',
                price=300000,  # 3000 рублей
                duration_days=30,
                description='Индивидуальные занятия с тренером',
                features=json.dumps([
                    'Индивидуальные занятия',
                    'Персональная программа',
                    'Контроль питания',
                    'Гибкий график',
                    'Корректировка программы'
                ])
            )
        ]
        
        for sub_type in subscription_types:
            db.session.add(sub_type)
        
        # Создаем тренеров
        trainers = [
            Trainer(
                name='Александра Магомедова',
                specialization='Фитнес-тренер по танцам',
                experience=8,
                bio='Сертифицированный тренер с опытом 8 лет',
                photo_url='https://images.unsplash.com/photo-1594381898411-846e7d193883'
            ),
            Trainer(
                name='Игорь Вихрев',
                specialization='Фитнес-тренер по кардио',
                experience=12,
                bio='Профессиональный тренер по кардиотренировкам',
                photo_url='https://images.unsplash.com/photo-1563122870-6b0b48a0af09'
            ),
            Trainer(
                name='Артём Ветров',
                specialization='Тренер по волейболу и борьбе',
                experience=10,
                bio='Мастер спорта по борьбе',
                photo_url='https://images.unsplash.com/photo-1548690312-e3b507d8c110'
            )
        ]
        
        for trainer in trainers:
            db.session.add(trainer)
        
        # Создаем тестового пользователя
        test_user = User(
            email='test@test.com',
            password=generate_password_hash('test123'),
            first_name='Тест',
            last_name='Тестовый',
            phone='+79999999999'
        )
        db.session.add(test_user)
        
        db.session.commit()
        print("База данных инициализирована с начальными данными")