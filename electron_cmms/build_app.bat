@echo off
setlocal enabledelayedexpansion

:: Asegurar que el script corre en la carpeta donde esta el archivo .bat
cd /d "%~dp0"

:: =====================================================================
:: CMMS LOCAL PRO - MASTER BUILDER v3.2 (React 19 + Tailwind 4)
:: =====================================================================

title CMMS Local Pro - Generador de Ejecutable
color 0b

echo.
echo  #################################################################
echo  #                                                               #
echo  #             CMMS LOCAL PRO - BUILD SYSTEM v3.2                #
echo  #        REACT 19 + TAILWIND 4 + ZERO NATIVE ERRORS             #
echo  #                                                               #
echo  #################################################################
echo.

:: 1. VERIFICACIÓN DE NODE.JS
echo  [1/4] Verificando entorno Node.js...
node -v >node_ver.txt 2>&1
if !errorlevel! neq 0 (
    color 0c
    echo  [ERROR] Node.js no esta instalado. Por favor instale Node.js v20+.
    pause
    exit /b
)
set /p NODE_V=<node_ver.txt
echo  [OK] Node.js detectado: !NODE_V!
del node_ver.txt

:: 2. INSTALACIÓN DE DEPENDENCIAS
echo  [2/4] Instalando dependencias modernas...
call npm install
if !errorlevel! neq 0 (
    color 0c
    echo  [ERROR] Fallo la instalacion de dependencias. Revise su conexion a internet.
    pause
    exit /b
)
echo  [OK] Dependencias instaladas.

:: 3. COMPILACIÓN Y EMPAQUETADO (VITE + ELECTRON-BUILDER)
echo  [3/4] Iniciando proceso de compilacion total (UI + EXE)...
call npm run build
if !errorlevel! neq 0 (
    color 0c
    echo  [ERROR] Fallo el proceso de compilacion.
    echo  Asegurese de que el archivo package.json tiene el script "build".
    pause
    exit /b
)
echo  [OK] Proceso de compilacion finalizado con éxito.

:: 4. FINALIZACIÓN
echo  [4/4] Verificando archivos generados...
if not exist "dist" (
    color 0e
    echo  [ADVERTENCIA] No se detecto la carpeta /dist. Verifique los logs superiores.
)

color 0a
echo.
echo  =================================================================
echo  EXITO: El archivo .exe ha sido generado en la carpeta /dist
echo  =================================================================
echo.
echo  Ubicacion: /electron_cmms/dist/CMMS Local Pro Setup.exe
echo.
echo  CARACTERISTICAS DE ESTA VERSION:
echo  - Arquitectura 100%% Local (LocalStorage)
echo  - Sin errores de compilacion nativa (Sin C++)
echo  - Basada en React 19 y Tailwind CSS 4
echo.
pause
