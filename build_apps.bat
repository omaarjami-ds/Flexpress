@echo off
cd /d "c:\projet\projet delevery\frontend"
echo Building React app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)
echo React build completed successfully!
