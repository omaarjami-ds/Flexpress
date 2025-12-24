@echo off
echo ===================================================
echo FLEXPRESS ANDROID ENVIRONMENT SETUP
echo ===================================================

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator privileges confirmed.
) else (
    echo ERROR: Current user is NOT administrator.
    echo Please right-click on this script and select "Run as Administrator".
    pause
    exit
)

echo.
echo Installing OpenJDK 17...
choco install openjdk17 -y

echo.
echo Installing Android Studio...
echo NOTE: This may take a while as it downloads the IDE and SDK.
choco install android-studio -y

echo.
echo ===================================================
echo Setup complete!
echo 1. Open Android Studio and complete the initial setup wizard to install the SDK components.
echo 2. Restart your computer or terminal to load new environment variables.
echo 3. Run 'build_apk.bat' to generate the application.
echo ===================================================
pause
