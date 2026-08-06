@echo off
REM Wrapper para deploy cloud-only em PowerShell
REM Uso: deploy.bat [version]

set VERSION=%1
if "%VERSION%"=="" set VERSION=latest

echo ==========================================
echo Easy Parking - Deploy Cloud Only
echo ==========================================
echo Versao: %VERSION%
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0deploy-cloudrun.ps1" -Version "%VERSION%"
if errorlevel 1 exit /b 1
