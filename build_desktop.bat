@echo off
echo ===================================================
echo FLEXPRESS DESKTOP BUILDER
echo ===================================================

cd frontend

echo Building Frontend...
call npm run build

echo Syncing with Electron...
call npx cap copy electron

cd electron

echo Installing Electron dependencies...
call npm install

echo Building Windows Executable...
call npm run electron:make

if %errorLevel% == 0 (
    echo.
    echo ===================================================
    echo BUILD SUCCESSFUL!
    echo ===================================================
    echo The installer is located in:
    echo frontend\electron\dist_production
    echo.
    powershell -Command "Copy-Item 'dist_production\Flexpress Setup 1.0.0.exe' '..\..\Flexpress_Desktop_Setup.exe' -Force"
    explorer "dist_production"
) else (
    echo.
    echo ===================================================
    echo BUILD FAILED
    echo ===================================================
)
pause
