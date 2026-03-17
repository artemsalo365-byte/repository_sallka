from app import app
from models import db, User, SubscriptionType

def test_database():
    with app.app_context():
        # Проверяем пользователей
        users = User.query.all()
        print(f" Пользователей в БД: {len(users)}")
        
        # Проверяем типы абонементов
        subscriptions = SubscriptionType.query.all()
        print(f" Типов абонементов в БД: {len(subscriptions)}")
        
        # Выводим информацию
        print("\n Типы абонементов:")
        for sub in subscriptions:
            print(f"   - {sub.name}: {sub.price/100} ₽")
        
        # Проверяем тестового пользователя
        test_user = User.query.filter_by(email='test@test.com').first()
        if test_user:
            print(f"\n Тестовый пользователь найден: {test_user.first_name} {test_user.last_name}")
        else:
            print("\n Тестовый пользователь не найден")

if __name__ == '__main__':
    test_database()