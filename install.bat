@echo off
echo Installation de FLEXPRESS...
echo.

echo Installation des dependances Python...
cd backend
python -m pip install -r requirements.txt
cd ..

echo.
echo Installation des dependances Node.js...
cd frontend
call npm install
cd ..

echo.
echo Initialisation des donnees de test...
python backend\init_data.py

echo.
echo Installation terminee!
echo.
echo Pour demarrer:
echo   1. Ouvrez un terminal et executez: start_backend.bat
echo   2. Ouvrez un autre terminal et executez: start_frontend.bat
echo.
pause

