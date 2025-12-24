@echo off
echo ===================================================
echo UPLOAD DE L'APK EN LIGNE
echo ===================================================

set "APK_PATH=frontend\android\app\build\outputs\apk\debug\app-debug.apk"

:: Verifier si l'APK existe
if not exist "%APK_PATH%" (
    echo.
    echo [ERREUR] Fichier APK introuvable !
    echo.
    echo Vous devez d'abord construire l'application.
    echo 1. Lancez 'setup_android.bat' (en Admin) si ce n'est pas fait
    echo 2. Lancez 'build_apk.bat'
    echo.
    pause
    exit /b
)

echo.
echo Upload de l'APK vers un serveur public (transfer.sh)...
echo Veuillez patienter (cela depend de votre connexion)...
echo.

:: Upload avec curl
curl --upload-file "%APK_PATH%" "https://transfer.sh/flexpress.apk" > upload_result.txt

:: Lire et afficher le lien
echo.
echo ===================================================
echo LIEN DE TELECHARGEMENT GENERE :
echo ===================================================
type upload_result.txt
echo.
echo.
echo 1. Copiez le lien ci-dessus (selectionnez + Entree)
echo 2. Envoyez-le sur votre telephone (WhatsApp/Email)
echo 3. Ouvrez-le pour telecharger et installer l'APK
echo ===================================================

del upload_result.txt
pause
