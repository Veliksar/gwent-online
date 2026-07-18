@echo off
echo ========================================
echo    Gwent Classic - Installation
echo ========================================
echo.

echo [1/6] Checking Composer...
where composer >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Composer not found
    echo Download from https://getcomposer.org/download/
    pause
    exit /b 1
)
echo OK

echo [2/6] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    echo Download from https://nodejs.org/
    pause
    exit /b 1
)
echo OK

echo [3/6] Installing PHP dependencies...
cd /d %~dp0
call composer install
if %errorlevel% neq 0 (
    echo ERROR: Composer install failed
    pause
    exit /b 1
)

echo [4/6] Setting up configuration...
if not exist ".env" (
    copy .env.example .env
    echo Created .env file
    echo IMPORTANT: Edit .env and set database settings!
) else (
    echo .env file already exists
)

echo [5/6] Generating application key...
call php artisan key:generate

echo [6/6] Installing Frontend dependencies...
cd /d %~dp0frontend
if not exist ".env" (
    copy .env.example .env
)
call npm install

echo.
echo ========================================
echo    Installation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Create MySQL database: gwent
echo 2. Edit .env file (DB settings)
echo 3. Run: php artisan migrate
echo 4. Run: start-dev.bat
echo.
pause
