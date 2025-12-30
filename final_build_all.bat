@echo off
setlocal enabledelayedexpansion

cd /d "c:\projet\projet delevery\frontend"

echo.
echo ===================================================
echo REBUILDING REACT APP WITH LATEST CHANGES...
echo ===================================================
call npm run build
if errorlevel 1 (
    echo React build failed!
    exit /b 1
)

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
echo BUILDING ELECTRON APP...
echo ===================================================
cd electron
call npm run electron:make
if errorlevel 1 (
    echo Electron build failed!
    exit /b 1
)

echo.
echo ===================================================
echo BUILD COMPLETE!
echo ===================================================
echo.
echo React app updated in: c:\projet\projet delevery\frontend\build
echo Electron app in: c:\projet\projet delevery\frontend\electron\dist_final_keyboard
echo.
pause
