@echo off
cd /d "c:\projet\projet delevery\frontend"

echo Cleaning build directory...
if exist build (
    rmdir /s /q build
)

echo Cleaning node_modules cache...
call npm cache clean --force

echo.
echo REBUILDING REACT APP (CLEAN BUILD)...
call npm run build

if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo ===================================================
echo VERIFYING CSS WAS INCLUDED...
echo ===================================================
findstr /m "orders-queue-list" build\static\css\*.css
if errorlevel 1 (
    echo CSS not found in build!
) else (
    echo CSS found in build!
)

echo.
echo Build complete!
pause
