@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Complete Project Setup and Launcher

:: ============================================================
:: PROJECT SETUP & SERVER LAUNCHER
:: ============================================================

echo.
echo ============================================================
echo        PROJECT SETUP ^& SERVER LAUNCHER
echo ============================================================
echo.

:: ------------------------------------------------------------
:: 0. CHECK PROJECT DIRECTORY
:: ------------------------------------------------------------

cd /d "%~dp0"

echo Project directory:
echo %CD%
echo.

if not exist "backend" (
    echo ERROR: Backend folder not found!
    echo Expected:
    echo %CD%\backend
    echo.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ERROR: Frontend folder not found!
    echo Expected:
    echo %CD%\frontend
    echo.
    pause
    exit /b 1
)

:: ------------------------------------------------------------
:: 1. CHECK PYTHON
:: ------------------------------------------------------------

echo ============================================================
echo [1/3] BACKEND SETUP
echo ============================================================
echo.

echo Checking Python...

python --version >nul 2>&1

if errorlevel 1 (
    echo.
    echo ERROR: Python was not found.
    echo.
    echo Make sure Python is installed and added to PATH.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%A in ('python --version 2^>^&1') do (
    echo Python: %%A
)

echo.

:: ------------------------------------------------------------
:: 2. CREATE VIRTUAL ENVIRONMENT
:: ------------------------------------------------------------

if not exist "backend\venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    echo.

    python -m venv "backend\venv"

    if errorlevel 1 (
        echo.
        echo ====================================================
        echo ERROR: Failed to create Python virtual environment.
        echo ====================================================
        echo.
        pause
        exit /b 1
    )

    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists.
)

echo.

:: ------------------------------------------------------------
:: 3. VERIFY VENV PYTHON
:: ------------------------------------------------------------

if not exist "backend\venv\Scripts\python.exe" (
    echo.
    echo ERROR: Virtual environment Python was not created.
    echo.
    pause
    exit /b 1
)

echo Using virtual environment Python:

"backend\venv\Scripts\python.exe" --version

if errorlevel 1 (
    echo.
    echo ERROR: Virtual environment Python is not working.
    echo.
    pause
    exit /b 1
)

echo.

:: ------------------------------------------------------------
:: 4. UPGRADE PIP
:: ------------------------------------------------------------

echo Upgrading pip...
echo.

"backend\venv\Scripts\python.exe" -m pip install --upgrade pip

if errorlevel 1 (
    echo.
    echo ====================================================
    echo WARNING: pip upgrade failed.
    echo ====================================================
    echo.
    echo Continuing with the existing pip version...
    echo.
)

echo.

:: ------------------------------------------------------------
:: 5. CHECK REQUIREMENTS FILE
:: ------------------------------------------------------------

if not exist "backend\requirements.txt" (
    echo.
    echo ERROR: requirements.txt not found!
    echo.
    echo Expected:
    echo %CD%\backend\requirements.txt
    echo.
    pause
    exit /b 1
)

echo Requirements file found:
echo backend\requirements.txt
echo.

:: ------------------------------------------------------------
:: 6. INSTALL PYTHON REQUIREMENTS
:: ------------------------------------------------------------

echo ============================================================
echo Installing Python requirements...
echo ============================================================
echo.
echo This may take several minutes depending on your internet
echo connection and the packages in requirements.txt.
echo.
echo ------------------------------------------------------------

"backend\venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"

if errorlevel 1 (
    echo.
    echo ------------------------------------------------------------
    echo ERROR: Python requirements installation FAILED.
    echo ------------------------------------------------------------
    echo.
    echo The setup has been stopped.
    echo.
    echo To see more details, run this manually:
    echo.
    echo backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt -v
    echo.
    pause
    exit /b 1
)

echo.
echo ------------------------------------------------------------
echo Python requirements installed successfully.
echo ------------------------------------------------------------
echo.

:: ------------------------------------------------------------
:: 7. CHECK NODE.JS
:: ------------------------------------------------------------

echo ============================================================
echo [2/3] FRONTEND SETUP
echo ============================================================
echo.

echo Checking Node.js...

node --version

if errorlevel 1 goto NODE_MISSING

echo.

echo Checking npm...

call npm --version

if errorlevel 1 goto NPM_MISSING

echo.

if exist "%~dp0frontend\package.json" goto PACKAGE_EXISTS

echo ERROR: frontend\package.json not found.
echo.
goto SETUP_FAILED

:PACKAGE_EXISTS

if exist "%~dp0frontend\node_modules\" goto NODE_MODULES_EXISTS

echo node_modules not found.
echo.
echo Installing frontend packages...
echo.

cd /d "%~dp0frontend"

call npm install

if errorlevel 1 goto NPM_INSTALL_FAILED

cd /d "%~dp0"

echo.
echo Frontend packages installed successfully.
echo.

goto FRONTEND_READY

:NODE_MODULES_EXISTS

echo frontend\node_modules already exists.
echo Skipping npm install.
echo.

:FRONTEND_READY

echo ============================================================
echo [3/3] STARTING SERVERS
echo ============================================================
echo.

if not exist "backend\run.py" (
    echo WARNING: backend\run.py was not found.
    echo.
    echo Expected:
    echo %CD%\backend\run.py
    echo.
    echo Backend server will NOT be started.
    echo.
    set "BACKEND_OK=0"
) else (
    set "BACKEND_OK=1"
)

if not exist "frontend\package.json" (
    echo WARNING: frontend\package.json was not found.
    echo.
    echo Frontend server will NOT be started.
    echo.
    set "FRONTEND_OK=0"
) else (
    set "FRONTEND_OK=1"
)

:: ------------------------------------------------------------
:: 12. DISPLAY SERVER INFORMATION
:: ------------------------------------------------------------

echo ============================================================
echo                    SERVER INFORMATION
echo ============================================================
echo.
echo Backend  : http://127.0.0.1:8000
echo DB Test  : http://127.0.0.1:8000/api/db-test
echo Frontend : http://localhost:3000
echo.
echo ============================================================
echo.

:: ------------------------------------------------------------
:: 13. START BACKEND
:: ------------------------------------------------------------

if "%BACKEND_OK%"=="1" (

    echo Starting Backend Server...

    start "Backend - Python Server" cmd /k ^
    "cd /d "%~dp0backend" && echo ======================================== && echo BACKEND SERVER && echo ======================================== && echo. && call venv\Scripts\activate.bat && python run.py"

    echo Backend server window started.
    echo.

) else (

    echo Backend server was skipped.
    echo.

)

:: ------------------------------------------------------------
:: 14. START FRONTEND
:: ------------------------------------------------------------

if "%FRONTEND_OK%"=="1" (

    echo Starting Frontend Server...

    start "Frontend - Next.js" cmd /k ^
    "cd /d "%~dp0frontend" && echo ======================================== && echo FRONTEND SERVER && echo ======================================== && echo. && npm run dev"

    echo Frontend server window started.
    echo.

) else (

    echo Frontend server was skipped.
    echo.

)

:: ------------------------------------------------------------
:: 15. COMPLETE
:: ------------------------------------------------------------

echo.
echo ============================================================
echo                 SETUP COMPLETED
echo ============================================================
echo.

if "%BACKEND_OK%"=="1" (
    echo Backend:
    echo   http://127.0.0.1:8000
    echo   http://127.0.0.1:8000/api/db-test
    echo.
)

if "%FRONTEND_OK%"=="1" (
    echo Frontend:
    echo   http://localhost:3000
    echo.
)

echo ============================================================
echo.
echo The server windows are now running.
echo You can close this window.
echo.
pause

endlocal
