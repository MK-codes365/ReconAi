@echo off
TITLE ReconAI Revenue Recovery System
color 0A
echo =========================================================
echo  ReconAI Revenue Recovery System - 1-Click Startup
echo =========================================================
echo.
echo  Starting all 3 services in parallel:
echo   - Next.js Web Dashboard:  http://localhost:3000
echo   - Backend API & Workers:  http://localhost:4000
echo   - FastAPI ML Service:     http://localhost:8000
echo.
cd /d E:\ReconAi
npm start
pause
