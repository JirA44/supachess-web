# Script de déploiement AIMix Pro sur Cloudflare Pages
# Version PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOIEMENT AIMIX PRO SUR CLOUDFLARE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Se déplacer dans le dossier du script
Set-Location $PSScriptRoot

Write-Host "Vérification des fichiers..." -ForegroundColor Yellow

$requiredFiles = @(
    "AIMIX_TEACHER_ENHANCED.html",
    "index.html",
    "_headers",
    "_redirects",
    "README.md"
)

$allPresent = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[ERREUR] $file non trouvé!" -ForegroundColor Red
        $allPresent = $false
    }
}

if (-not $allPresent) {
    Write-Host ""
    Write-Host "Certains fichiers sont manquants!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CHOIX DE LA METHODE DE DEPLOIEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Déploiement automatique via Wrangler (CLI)" -ForegroundColor White
Write-Host "2. Ouvrir le dashboard Cloudflare (Manuel)" -ForegroundColor White
Write-Host "3. Ouvrir le dossier dans l'explorateur" -ForegroundColor White
Write-Host "4. Afficher les instructions détaillées" -ForegroundColor White
Write-Host "5. Annuler" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Votre choix (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Lancement du déploiement avec Wrangler..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Si c'est votre première fois:" -ForegroundColor Cyan
        Write-Host "  1. Vous devrez vous authentifier" -ForegroundColor Cyan
        Write-Host "  2. Une page web s'ouvrira" -ForegroundColor Cyan
        Write-Host "  3. Autorisez Wrangler" -ForegroundColor Cyan
        Write-Host ""

        # Vérifier si wrangler est installé
        $wranglerInstalled = Get-Command wrangler -ErrorAction SilentlyContinue

        if ($wranglerInstalled) {
            Write-Host "Wrangler détecté, déploiement..." -ForegroundColor Green
            wrangler pages deploy . --project-name=aimix-chess
        } else {
            Write-Host "Wrangler non installé, utilisation de npx..." -ForegroundColor Yellow
            npx wrangler@latest pages deploy . --project-name=aimix-chess
        }

        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  DEPLOIEMENT TERMINE!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Votre site devrait être accessible sur:" -ForegroundColor Cyan
        Write-Host "  https://aimix-chess.pages.dev" -ForegroundColor Yellow
        Write-Host ""
    }

    "2" {
        Write-Host ""
        Write-Host "Ouverture du dashboard Cloudflare..." -ForegroundColor Yellow
        Start-Process "https://dash.cloudflare.com/"
        Write-Host ""
        Write-Host "Instructions:" -ForegroundColor Cyan
        Write-Host "  1. Cliquez sur 'Pages' dans le menu" -ForegroundColor White
        Write-Host "  2. 'Créer un projet' > 'Télécharger fichiers'" -ForegroundColor White
        Write-Host "  3. Glissez-déposez les fichiers de ce dossier" -ForegroundColor White
        Write-Host "  4. Nom: aimix-chess" -ForegroundColor White
        Write-Host "  5. Déployer" -ForegroundColor White
        Write-Host ""

        # Ouvrir aussi le dossier
        Start-Process explorer.exe $PSScriptRoot
    }

    "3" {
        Write-Host ""
        Write-Host "Ouverture de l'explorateur..." -ForegroundColor Yellow
        Start-Process explorer.exe $PSScriptRoot
    }

    "4" {
        Write-Host ""
        if (Test-Path "GUIDE_DEPLOIEMENT_RAPIDE.md") {
            Start-Process notepad.exe "GUIDE_DEPLOIEMENT_RAPIDE.md"
        } else {
            Write-Host "Guide non trouvé, affichage des instructions:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "=== DEPLOIEMENT MANUEL ===" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "1. Allez sur https://dash.cloudflare.com/" -ForegroundColor White
            Write-Host "2. Pages > Créer un projet > Télécharger fichiers" -ForegroundColor White
            Write-Host "3. Sélectionnez tous les fichiers de ce dossier:" -ForegroundColor White
            Write-Host "   - AIMIX_TEACHER_ENHANCED.html" -ForegroundColor Gray
            Write-Host "   - index.html" -ForegroundColor Gray
            Write-Host "   - _headers" -ForegroundColor Gray
            Write-Host "   - _redirects" -ForegroundColor Gray
            Write-Host "   - README.md" -ForegroundColor Gray
            Write-Host "4. Nom du projet: aimix-chess" -ForegroundColor White
            Write-Host "5. Cliquez sur 'Déployer'" -ForegroundColor White
            Write-Host ""
            Write-Host "Après 2-3 minutes, votre site sera accessible!" -ForegroundColor Green
        }
    }

    "5" {
        Write-Host ""
        Write-Host "Annulé." -ForegroundColor Yellow
    }

    default {
        Write-Host ""
        Write-Host "Choix invalide." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
pause
