@echo off
cd /d "c:\projet\projet delevery"
git init
git remote add origin https://github.com/omaarjami-ds/Flexpress.git
git config user.name "FlexPress Dev"
git config user.email "dev@flexpress.com"
git add .
git commit -m "Feat: Add client contact info and auto-location for delivery drivers"
git branch -M main
git push -u origin main
pause
