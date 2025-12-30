@echo off
cd /d "c:\projet\projet delevery\frontend"

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
pause
