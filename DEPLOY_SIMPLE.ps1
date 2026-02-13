# Script de déploiement simplifié AIMix Pro
# Ce script crée un package prêt à uploader

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PACKAGE DE DEPLOIEMENT AIMIX PRO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sourceDir = $PSScriptRoot
$packageName = "aimix-chess-deploy.zip"

Write-Host "Creation du package de deploiement..." -ForegroundColor Yellow
Write-Host ""

# Fichiers à inclure
$files = @(
    "AIMIX_TEACHER_ENHANCED.html",
    "index.html",
    "_headers",
    "_redirects",
    "README.md",
    "wrangler.toml"
)

# Vérifier que tous les fichiers existent
$allFilesPresent = $true
foreach ($file in $files) {
    $filePath = Join-Path $sourceDir $file
    if (Test-Path $filePath) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[ERREUR] $file manquant!" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host ""
    Write-Host "Certains fichiers sont manquants!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "Tous les fichiers sont presents!" -ForegroundColor Green
Write-Host ""

# Créer le ZIP
$zipPath = Join-Path $sourceDir $packageName
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

try {
    # Créer le ZIP avec les fichiers
    $compress = @{
        Path = $files | ForEach-Object { Join-Path $sourceDir $_ }
        DestinationPath = $zipPath
        CompressionLevel = "Optimal"
    }
    Compress-Archive @compress

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  PACKAGE CREE AVEC SUCCES!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Fichier ZIP cree:" -ForegroundColor Cyan
    Write-Host "  $zipPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Taille: $([Math]::Round((Get-Item $zipPath).Length / 1KB, 2)) KB" -ForegroundColor Cyan
    Write-Host ""

    # Ouvrir le dossier
    Write-Host "Ouverture du dossier..." -ForegroundColor Yellow
    Start-Process explorer.exe "/select,$zipPath"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  INSTRUCTIONS DE DEPLOIEMENT" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Allez sur:" -ForegroundColor White
    Write-Host "   https://dash.cloudflare.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Pages > aimix-chess > Deployments" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Create deployment" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Uploadez le fichier ZIP:" -ForegroundColor White
    Write-Host "   $packageName" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "5. Save and Deploy" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""

    # Proposer d'ouvrir Cloudflare
    $openCF = Read-Host "Voulez-vous ouvrir Cloudflare maintenant? (O/N)"
    if ($openCF -eq "O" -or $openCF -eq "o") {
        Start-Process "https://dash.cloudflare.com/"
        Write-Host ""
        Write-Host "Dashboard Cloudflare ouvert!" -ForegroundColor Green
    }

} catch {
    Write-Host ""
    Write-Host "ERREUR lors de la creation du ZIP:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution alternative:" -ForegroundColor Yellow
    Write-Host "Selectionnez manuellement les 6 fichiers et uploadez-les" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
pause
