cd "c:\projet\projet delevery"
if (-not (Test-Path ".git")) {
    git init
    git remote add origin "https://github.com/omaarjami-ds/Flexpress.git"
    Write-Host "Repository git initialisé"
} else {
    Write-Host "Repository git existe déjà"
}
git remote -v
