@echo off
echo ========================================
echo   DEPLOIEMENT AUTOMATIQUE AIMIX PRO
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Verification des fichiers...
if not exist "AIMIX_TEACHER_ENHANCED.html" (
    echo ERREUR: Fichier principal manquant!
    pause
    exit /b 1
)
echo [OK] Fichiers detectes
echo.

echo [2/5] Authentification Cloudflare...
echo IMPORTANT: Une page web va s'ouvrir pour l'authentification
echo Autorisez Wrangler dans votre navigateur
echo.
pause

call npx -y wrangler@latest login
if errorlevel 1 (
    echo ERREUR: Authentification echouee
    pause
    exit /b 1
)

echo.
echo [3/5] Preparation du deploiement...
echo.

echo [4/5] Upload des fichiers sur Cloudflare...
echo Ceci peut prendre 1-2 minutes...
echo.

call npx -y wrangler@latest pages deploy . --project-name=aimix-chess --branch=production

if errorlevel 1 (
    echo.
    echo ERREUR lors du deploiement!
    echo.
    echo Solutions:
    echo 1. Verifiez votre connexion internet
    echo 2. Assurez-vous d'etre authentifie
    echo 3. Le projet existe peut-etre deja - supprimez-le sur le dashboard
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   DEPLOIEMENT TERMINE!
echo ========================================
echo.
echo Votre site est accessible sur:
echo   https://aimix-chess.pages.dev
echo.
echo [5/5] Ouverture du site...
start https://aimix-chess.pages.dev
echo.
echo ========================================
pause
