@echo off
setlocal enabledelayedexpansion

REM Set working directory
pushd "%~dp0"

REM ========== GIT SETUP ==========
echo.
echo ========== Git Repository Setup ==========
echo.

if exist .git (
    echo Git repository exists. Proceeding with commit and push.
) else (
    echo Initializing Git repository...
    call git init
    call git remote add origin https://github.com/omaarjami-ds/Flexpress.git
    call git config user.name "FlexPress Dev"
    call git config user.email "dev@flexpress.com"
    echo Git repository initialized.
)

echo.
echo Adding files...
call git add .

echo Committing changes...
call git commit -m "Feat: Add client contact info and auto-location for delivery drivers" || echo Commit may have failed or nothing to commit

echo.
echo Setting main branch...
call git branch -M main

echo.
echo Pushing to GitHub...
call git push -u origin main

echo.
echo ========== Git Complete ==========
echo.

REM ========== BUILD APK ==========
echo ========== Building APK ==========
echo.

cd frontend

REM Install dependencies if needed
if not exist node_modules (
    echo Installing npm dependencies...
    call npm install
)

REM Build web version
echo Building React app for web...
call npm run build

REM Sync Capacitor
echo Syncing Capacitor with Android...
call npx cap sync android

REM Build APK
cd android
echo.
echo Building APK with Gradle...
call gradlew.bat assembleDebug

echo.
echo ========== BUILD COMPLETE ==========
echo.
echo APK location:
dir /s "app\build\outputs\apk\debug\*.apk" 2>nul

popd
pause
