@echo off
REM ============================================
REM GPRO Logistic - Production Deployment Script (Windows)
REM ============================================
REM Uso: deploy.bat [backend|frontend|all]
REM ============================================

setlocal enabledelayedexpansion

echo ============================================
echo   GPRO Logistic - Deployment Script
echo ============================================

set "TARGET=%~1"
if "%TARGET%"=="" set "TARGET=all"

if "%TARGET%"=="backend" goto :backend
if "%TARGET%"=="frontend" goto :frontend
if "%TARGET%"=="all" goto :all
echo Uso: deploy.bat [backend^|frontend^|all]
exit /b 1

:backend
echo.
echo [Backend] Starting deployment...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Run Django checks
echo Running Django system checks...
python manage.py check --deploy

REM Collect static files
echo Collecting static files...
python manage.py collectstatic --noinput --clear

REM Run migrations
echo Running database migrations...
python manage.py migrate --noinput

echo [Backend] Deployment complete!
cd ..
if "%TARGET%"=="backend" goto :done
goto :frontend

:frontend
echo.
echo [Frontend] Starting deployment...
cd frontend

REM Install dependencies
echo Installing dependencies...
call npm ci --silent

REM Build for production
echo Building for production...
call npm run build

echo [Frontend] Deployment complete!
echo Build output in: frontend\dist\
cd ..
goto :done

:all
goto :backend

:done
echo.
echo ============================================
echo   Deployment completed successfully!
echo ============================================
endlocal
