@echo off
cd /d "%~dp0"
echo ========== Git Status ==========
if exist ".git" (
    echo Git repository found
    git log --oneline -1
    echo.
    echo ========== Remote ==========
    git remote -v
) else (
    echo No Git repository found
)
echo.
echo ========== Building APK ==========
cd frontend
echo Current directory: %cd%
echo npm version:
call npm --version
echo.
echo Building...
call npm run build
cd android
echo.
echo Running Gradle build...
call gradlew.bat assembleDebug
echo.
echo APK files:
dir app\build\outputs\apk\debug\*.apk
