from app import app, mail_configured
import webbrowser
import threading
import time

def open_browser():
    time.sleep(1.5)
    webbrowser.open('http://localhost:5000')

if __name__ == '__main__':
    print("=" * 50)
    print("Запуск сервера IRONFLOW...")
    print("=" * 50)
    print("Сервер: http://localhost:5000")
    print("")
    print("Страницы:")
    print("   Главная:      http://localhost:5000/")
    print("   Вход:         http://localhost:5000/reg.html")
    print("   Регистрация:  http://localhost:5000/auth.html")
    print("   Абонементы:   http://localhost:5000/subscription.html")
    print("   Профиль:      http://localhost:5000/profile.html")
    print("")
    if mail_configured():
        print("Почта (восстановление пароля): настроена, письма будут отправляться.")
    else:
        print("Почта не настроена. Чтобы ссылка приходила на email:")
        print("  1. Откройте файл .env в папке проекта")
        print("  2. Заполните MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD (см. env.example)")
        print("  Для Gmail: пароль приложения в настройках Google-аккаунта.")
    print("")
    print("БД: fitness.db")
    print("=" * 50)
    print("Остановка: Ctrl+C")
    print("=" * 50)
    
    # Открываем браузер автоматически
    threading.Thread(target=open_browser).start()
    
    app.run(
        debug=True, 
        host='0.0.0.0', 
        port=5000,
        threaded=True
    )