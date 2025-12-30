@echo off
setlocal enabledelayedexpansion

echo.
echo ===================================================
echo KILLING ALL ELECTRON AND NODE PROCESSES...
echo ===================================================
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM Flexpress.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 /nobreak

cd /d "c:\projet\projet delevery\frontend"

echo.
echo ===================================================
echo FORCE CLEANING OLD BUILD ARTIFACTS...
echo ===================================================
if exist electron\dist_final_keyboard (
    echo Deleting dist_final_keyboard directory...
    for /F "delims=" %%A in ('dir /b electron\dist_final_keyboard 2^>nul') do (
        echo Removing: %%A
    )
    cd electron
    rmdir /s /q dist_final_keyboard >nul 2>&1
    cd ..
)

if exist electron\build (
    echo Deleting build directory...
    cd electron
    rmdir /s /q build >nul 2>&1
    cd ..
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
call npm run electron:pack
if errorlevel 1 (
    echo Build failed - trying with make...
    call npm run electron:make
    if errorlevel 1 (
        echo Build failed!
        exit /b 1
    )
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
