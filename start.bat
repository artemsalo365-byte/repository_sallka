@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   IRONFLOW — запуск сайта
echo ========================================
echo.

REM Проверка Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Python не найден.
    echo.
    echo Что сделать на этом ПК:
    echo   1. Установите Python с https://www.python.org/downloads/
    echo   2. При установке отметьте "Add Python to PATH"
    echo   3. Перезапустите этот файл
    echo.
    pause
    exit /b 1
)

REM Установка зависимостей (если ещё не стоят — поставит, если уже есть — быстро проверит)
echo Проверка зависимостей...
python -m pip install -r requirements.txt -q
if errorlevel 1 (
    echo Не удалось установить зависимости. Попробуйте вручную: pip install -r requirements.txt
    pause
    exit /b 1
)
echo.

REM Запуск
python run.py

pause
