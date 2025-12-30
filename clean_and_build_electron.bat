@echo off
setlocal enabledelayedexpansion

echo.
echo ===================================================
echo KILLING ELECTRON PROCESSES...
echo ===================================================
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM Flexpress.exe 2>nul
timeout /t 2 /nobreak

cd /d "c:\projet\projet delevery\frontend"

echo.
echo ===================================================
echo CLEANING OLD BUILD ARTIFACTS...
echo ===================================================
if exist electron\dist_final_keyboard (
    rmdir /s /q electron\dist_final_keyboard
)
if exist electron\build (
    rmdir /s /q electron\build
)

echo.
echo ===================================================
echo SYNCING WITH ELECTRON...
echo ===================================================
call npx cap copy electron
if errorlevel 1 (
    echo Sync failed!
    exit /b 1
)

cd electron

echo.
echo ===================================================
echo INSTALLING ELECTRON DEPENDENCIES...
echo ===================================================
call npm install
if errorlevel 1 (
    echo npm install failed!
    exit /b 1
)

echo.
echo ===================================================
echo BUILDING ELECTRON APP...
echo ===================================================
call npm run electron:make
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo ===================================================
echo ELECTRON BUILD SUCCESSFUL!
echo ===================================================
echo.
echo The executable is located at:
echo c:\projet\projet delevery\frontend\electron\dist_final_keyboard\
echo.
pause
