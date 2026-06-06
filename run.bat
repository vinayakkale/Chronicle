@echo off
title The Chronicle - Indian Newspaper Edition
cd /d "%~dp0"
echo =======================================================================
echo                 THE CHRONICLE - DIGITAL EDITION
echo =======================================================================
echo.

:: Detect if Python is available in PATH
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Python detected. Starting local HTTP server on port 8000...
    echo Launching http://localhost:8000 in your browser...
    start "" http://localhost:8000
    python -m http.server 8000
    goto end
)

:: Detect if Node.js / npx is available in PATH
where npx >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js (npx) detected. Starting http-server on port 8000...
    echo Launching http://localhost:8000 in your browser...
    start "" http://localhost:8000
    npx -y http-server -p 8000
    goto end
)

:: Fallback: Open index.html directly via file protocol
echo [WARN] Neither Python nor Node.js (npx) was found in your PATH.
echo.
echo Launching index.html directly using your default browser...
echo Note: Browser security policies may restrict some features when run as a file://.
echo.
pause
start "" "index.html"

:end
