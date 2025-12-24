@echo off
echo ===================================================
echo FLEXPRESS APK BUILDER
echo ===================================================

cd frontend/android

:: Check if JAVA_HOME is set
if "%JAVA_HOME%"=="" (
    echo WARNING: JAVA_HOME is not set.
    echo Please run setup_android.bat as Administrator first, or restart your terminal.
)

echo Building Debug APK...
call .\gradlew.bat assembleDebug

if %errorLevel% == 0 (
    echo.
    echo ===================================================
    echo BUILD SUCCESSFUL!
    echo ===================================================
    echo APK Location:
    echo frontend\android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    explorer "app\build\outputs\apk\debug"
) else (
    echo.
    echo ===================================================
    echo BUILD FAILED
    echo ===================================================
    echo Please ensure:
    echo 1. Java JDK 17 is installed
    echo 2. Android SDK is installed
    echo 3. JAVA_HOME environment variable is set
)
pause
