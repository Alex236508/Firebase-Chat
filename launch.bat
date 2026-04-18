@echo off
cd /d "%~dp0"
powershell -NoExit -ExecutionPolicy Bypass -File "launch.ps1"
