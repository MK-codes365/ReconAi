# ReconAI — 1-Click System Startup Script for Windows
# Launches Frontend (3000), Backend API (4000), and Python ML Service (8000)

$Host.UI.RawUI.WindowTitle = "ReconAI Revenue Recovery System"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " 🚀 Starting ReconAI Revenue Recovery System..." -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Cyan

Set-Location -Path "E:\ReconAi"

# Check if Node.js & Python are available
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npm is not installed or not in PATH." -ForegroundColor Red
    Exit 1
}

if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Python is not installed or not in PATH." -ForegroundColor Red
    Exit 1
}

Write-Host ""
Write-Host "📡 Starting 3 Parallel Services..." -ForegroundColor Yellow
Write-Host "   1. Next.js Frontend Command Center -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "   2. NestJS Backend API and Workers  -> http://localhost:4000" -ForegroundColor Cyan
Write-Host "   3. FastAPI ML Prediction Service   -> http://localhost:8000" -ForegroundColor Cyan
Write-Host ""

# Run all 3 servers using npm start (concurrently)
npm start
