@echo off
echo Starting project setup...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the correct directory.
    pause
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
call npm install

:: Find an available port starting from 3000
set PORT=3000
:FINDPORT
netstat -o -n -a | findstr ":%PORT% " > nul
if %ERRORLEVEL% equ 0 (
    set /a PORT+=1
    goto :FINDPORT
)

:: Determine the start command based on package.json content
echo Checking available scripts...
for /f "tokens=* usebackq" %%a in (`npm run`) do (
    echo %%a | findstr /i /c:"dev" > nul && (
        echo Found dev script, using npm run dev...
        start cmd /c "npm run dev -- --port=%PORT%"
        goto :STARTBROWSER
    )
    echo %%a | findstr /i /c:"start" > nul && (
        echo Found start script, using npm start...
        start cmd /c "npm start -- --port=%PORT%"
        goto :STARTBROWSER
    )
)

:: If no standard scripts found, try vite directly
echo No standard scripts found, trying vite...
start cmd /c "npx vite --port=%PORT%"

:STARTBROWSER
:: Wait for server to start
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

:: Open in default browser
echo Opening browser...
start http://localhost:%PORT%

echo Setup complete! Project running on port %PORT%
pause