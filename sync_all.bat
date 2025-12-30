@echo off
cd /d "c:\projet\projet delevery\frontend"

echo.
echo ===================================================
echo SYNCING TO ELECTRON...
echo ===================================================
call npx cap copy electron
if errorlevel 1 (
    echo Electron sync failed!
    exit /b 1
)

echo.
echo ===================================================
echo SYNCING TO CAPACITOR (ANDROID)...
echo ===================================================
call npx cap sync
if errorlevel 1 (
    echo Capacitor sync failed!
    exit /b 1
)

echo.
echo ===================================================
echo SYNC COMPLETE!
echo ===================================================
echo.
echo Changes are now available in:
echo - Electron app: c:\projet\projet delevery\frontend\electron\app
echo - Android app: c:\projet\projet delevery\frontend\android
echo.
pause
