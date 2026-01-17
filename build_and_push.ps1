param([switch]$SkipGit = $false, [switch]$SkipBuild = $false)

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "Project Root: $projectRoot"
Write-Host "========== STEP 1: Git Setup and Push ==========" -ForegroundColor Green

if (-not $SkipGit) {
    if (-not (Test-Path ".git")) {
        Write-Host "Initializing Git repository..."
        git init
        git remote add origin "https://github.com/omaarjami-ds/Flexpress.git"
        git config user.name "FlexPress Dev"
        git config user.email "dev@flexpress.com"
    } else {
        Write-Host "Git repository already exists"
    }
    
    Write-Host "Adding files and committing..."
    git add -A
    git commit -m "Feat: Add client contact info and auto-location for delivery drivers"
    
    Write-Host "Pushing to GitHub..."
    git branch -M main
    git push -u origin main 2>&1 | Write-Host
    
    Write-Host "Git push complete!" -ForegroundColor Green
} else {
    Write-Host "Skipping Git operations"
}

Write-Host ""
Write-Host "========== STEP 2: Build APK ==========" -ForegroundColor Green

if (-not $SkipBuild) {
    Set-Location "$projectRoot\frontend"
    
    Write-Host "Installing npm dependencies..."
    npm install
    
    Write-Host "Building React web app..."
    npm run build
    
    Write-Host "Syncing Capacitor with Android..."
    npx cap sync android
    
    Set-Location "$projectRoot\frontend\android"
    
    Write-Host "Building APK with Gradle..."
    .\gradlew.bat assembleDebug
    
    Write-Host ""
    Write-Host "APK Build Complete!" -ForegroundColor Green
    Write-Host "APK Location: $projectRoot\frontend\android\app\build\outputs\apk\debug\" -ForegroundColor Yellow
    
    Get-ChildItem -Path "$projectRoot\frontend\android\app\build\outputs\apk\debug\" -Filter "*.apk" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Cyan
    }
} else {
    Write-Host "Skipping APK build"
}

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
