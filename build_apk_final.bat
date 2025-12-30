@echo off
cd /d "c:\projet\projet delevery\frontend\android"

echo.
echo ===================================================
echo BUILDING ANDROID APK...
echo ===================================================
echo.
echo Using Gradle to build APK with latest changes...
echo.

if exist "build\outputs\apk" (
    rmdir /s /q "build\outputs\apk"
)

call gradlew.bat build
if errorlevel 1 (
    echo.
    echo Attempting alternative build approach...
    call gradlew.bat assembleRelease
)

echo.
echo ===================================================
echo BUILD CHECK
echo ===================================================

if exist "build\outputs\apk\release\app-release.apk" (
    echo.
    echo SUCCESS: APK generated at:
    echo build\outputs\apk\release\app-release.apk
    echo.
) else if exist "build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo SUCCESS: Debug APK generated at:
    echo build\outputs\apk\debug\app-debug.apk
    echo.
) else (
    echo.
    echo APK not found in expected locations.
    echo Check build\outputs\apk for generated files.
    echo.
)

pause
