@echo off
REM Navigate to the project directory
cd /d "%CD%"
echo Project directory: %CD%

REM Check if .git exists
if exist ".git" (
    echo Repository git existe deja
) else (
    echo Initialisation du repository git...
    git init
    git remote add origin https://github.com/omaarjami-ds/Flexpress.git
    git config user.name "FlexPress Dev"
    git config user.email "dev@flexpress.com"
    echo Repository git initialise
)

REM Add all files and commit
echo Commit des changements...
git add .
git commit -m "Feat: Add client contact info and auto-location for delivery drivers"

REM Ensure main branch
git branch -M main

REM Try to push
echo Push vers GitHub...
git push -u origin main 2>&1

REM Now build APK
echo.
echo ========== Building APK Android ==========
cd frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

REM Build for web
echo Building web version...
call npm run build

REM Build APK
echo Building APK with Capacitor...
call npx cap sync android
call cd android
call gradlew assembleDebug
cd ..

echo APK built successfully!
echo APK location: %CD%\android\app\build\outputs\apk\debug
pause
