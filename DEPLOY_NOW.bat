@echo off
echo ========================================
echo   DEPLOIEMENT AIMIX PRO - MAINTENANT
echo ========================================
echo.

cd /d "%~dp0"

echo Deploiement en cours...
echo.

wrangler pages deploy . --project-name=aimix-chess > deploy.log 2>&1

if errorlevel 1 (
    echo.
    echo Erreur detectee. Voir deploy.log
    type deploy.log
    echo.
    echo Tentative avec npx...
    npx wrangler pages deploy . --project-name=aimix-chess
) else (
    echo.
    echo ========================================
    echo   DEPLOIEMENT TERMINE!
    echo ========================================
    echo.
    type deploy.log
    echo.
    echo Site accessible sur:
    echo   https://aimix-chess.pages.dev
    echo.
    start https://aimix-chess.pages.dev
)

echo.
pause
