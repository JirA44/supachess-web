@echo off
echo ========================================
echo   DEPLOIEMENT AIMIX PRO SUR CLOUDFLARE
echo ========================================
echo.

cd /d "%~dp0"

echo Verification des fichiers...
if not exist "AIMIX_TEACHER_ENHANCED.html" (
    echo ERREUR: AIMIX_TEACHER_ENHANCED.html non trouve!
    pause
    exit /b 1
)

if not exist "_headers" (
    echo ERREUR: _headers non trouve!
    pause
    exit /b 1
)

if not exist "_redirects" (
    echo ERREUR: _redirects non trouve!
    pause
    exit /b 1
)

echo [OK] Tous les fichiers sont presents
echo.

echo ========================================
echo   OPTION 1: Deploiement via Wrangler
echo ========================================
echo.
echo Commande a executer:
echo   npx wrangler pages deploy . --project-name=aimix-chess
echo.
echo Si c'est votre premier deploiement, vous devrez:
echo   1. Authentifier avec: npx wrangler login
echo   2. Suivre les instructions dans le navigateur
echo.

echo ========================================
echo   OPTION 2: Deploiement via Dashboard
echo ========================================
echo.
echo 1. Ouvrez: https://dash.cloudflare.com/
echo 2. Pages ^> Creer un projet ^> Telecharger fichiers
echo 3. Glissez-deposez tous les fichiers de ce dossier
echo 4. Nom du projet: aimix-chess
echo 5. Deployer
echo.

echo ========================================
echo   LANCER LE DEPLOIEMENT?
echo ========================================
echo.
choice /C YN /M "Voulez-vous lancer npx wrangler maintenant"

if errorlevel 2 goto manual
if errorlevel 1 goto auto

:auto
echo.
echo Lancement du deploiement...
echo.
npx wrangler pages deploy . --project-name=aimix-chess
goto end

:manual
echo.
echo OK, deploiement manuel.
echo Ouvrez le dossier dans l'explorateur Windows...
explorer .
echo.
echo Et suivez les instructions dans GUIDE_DEPLOIEMENT_RAPIDE.md
goto end

:end
echo.
echo ========================================
pause
