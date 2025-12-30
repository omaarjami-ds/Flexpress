# PowerShell script to rebuild Electron app with proper cleanup

Write-Host ""
Write-Host "===================================================" 
Write-Host "KILLING ALL ELECTRON PROCESSES..."
Write-Host "===================================================" 
Stop-Process -Name electron -Force -ErrorAction SilentlyContinue
Stop-Process -Name Flexpress -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

$frontendPath = "c:\projet\projet delevery\frontend"
Set-Location $frontendPath

Write-Host ""
Write-Host "===================================================" 
Write-Host "FORCE CLEANING BUILD DIRECTORIES..."
Write-Host "===================================================" 

$distPath = "$frontendPath\electron\dist_final_keyboard"
if (Test-Path $distPath) {
    Write-Host "Removing $distPath..."
    Remove-Item -Path $distPath -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

$buildPath = "$frontendPath\electron\build"
if (Test-Path $buildPath) {
    Write-Host "Removing $buildPath..."
    Remove-Item -Path $buildPath -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "===================================================" 
Write-Host "SYNCING WITH ELECTRON..."
Write-Host "===================================================" 
& npx cap copy electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "Sync failed!"
    exit 1
}

Set-Location "$frontendPath\electron"

Write-Host ""
Write-Host "===================================================" 
Write-Host "INSTALLING ELECTRON DEPENDENCIES..."
Write-Host "===================================================" 
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed!"
    exit 1
}

Write-Host ""
Write-Host "===================================================" 
Write-Host "BUILDING ELECTRON APP..."
Write-Host "===================================================" 
& npm run electron:make
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!"
    exit 1
}

Write-Host ""
Write-Host "===================================================" 
Write-Host "ELECTRON BUILD SUCCESSFUL!"
Write-Host "===================================================" 
Write-Host ""
Write-Host "The executable is located at:"
Write-Host "$frontendPath\electron\dist_final_keyboard\"
Write-Host ""
pause
