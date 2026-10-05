@echo off
chcp 65001 >nul
echo Configurando URL local de StockIA...

:: Comprobar permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Se requieren permisos de Administrador para modificar el archivo hosts.
    echo Solicitando permisos...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set HOSTS_FILE=%WINDIR%\System32\drivers\etc\hosts

findstr /C:"127.0.0.1 stockia" "%HOSTS_FILE%" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [OK] El dominio local 'stockia' ya esta configurado en tu sistema.
) else (
    echo. >> "%HOSTS_FILE%"
    echo 127.0.0.1 stockia >> "%HOSTS_FILE%"
    echo.
    echo [EXITO] Se agrego 'stockia' al archivo hosts de Windows.
)

echo.
echo Ahora puedes abrir tu navegador e ingresar a:
echo http://stockia:3000
echo.
pause
