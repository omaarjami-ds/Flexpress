@echo off
cd /d "c:\projet\projet delevery\frontend"

echo.
echo ===================================================
echo BUILDING UPDATED REACT APP
echo ===================================================
call npm run build
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo ===================================================
echo SYNCING TO ELECTRON
echo ===================================================
call npx cap copy electron
if errorlevel 1 (
    echo Electron sync failed!
    exit /b 1
)

echo.
echo ===================================================
echo SYNCING TO ANDROID/APK
echo ===================================================
call npx cap sync
if errorlevel 1 (
    echo Android sync failed!
    exit /b 1
)

echo.
echo ===================================================
echo BUILD AND SYNC COMPLETE!
echo ===================================================
echo.
echo Changes deployed to:
echo - Web app: frontend\build
echo - Electron: frontend\electron\app
echo - Android: frontend\android\app\src\main\assets\public
echo.
pause
