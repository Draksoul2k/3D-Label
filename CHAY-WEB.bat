@echo off
chcp 65001 >nul
title WEB TEM MAKET 3D (PORT 8888)
cd /d "%~dp0"

echo ======================================================================
echo    KH?I CH?Y WEB THI?T K? TEM MAKET 3D - C?NG 8888
echo    * Ch?y d?c l?p hoÖn toÖn, KHONG ?NH HU?NG d?n website kh†c tràn VPS
echo ======================================================================
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tçm th?y Python, dang kh?i ch?y web server qua Python...
    echo M? tràn VPS:    http://localhost:8888
    echo M? t? xa:       http://^<IP_VPS^>:8888
    echo.
    echo (D? t?t web, b?n ch? c?n b?m d?u X d¢ng c?a s? nÖy l?i)
    echo ----------------------------------------------------------------------
    python -m http.server 8888
    goto end
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tçm th?y Python Launcher, dang kh?i ch?y web server...
    echo M? tràn VPS:    http://localhost:8888
    echo M? t? xa:       http://^<IP_VPS^>:8888
    echo.
    echo (D? t?t web, b?n ch? c?n b?m d?u X d¢ng c?a s? nÖy l?i)
    echo ----------------------------------------------------------------------
    py -m http.server 8888
    goto end
)

where caddy >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tçm th?y Caddy CLI, dang ch?y web t?i c?ng 8888...
    echo M? tràn VPS:    http://localhost:8888
    echo M? t? xa:       http://^<IP_VPS^>:8888
    echo.
    caddy file-server --listen :8888
    goto end
)

echo [OK] Dang kh?i ch?y web server t°ch h?p s?n b?ng PowerShell...
echo M? tràn VPS:    http://localhost:8888
echo M? t? xa:       http://^<IP_VPS^>:8888
echo.
echo (D? t?t web, b?n ch? c?n b?m d?u X d¢ng c?a s? nÖy l?i)
echo ----------------------------------------------------------------------
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8888

:end
pause
