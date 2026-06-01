@echo off
REM HTTP Forge Launcher — Windows
REM Detects VS Code, downloads if missing, installs extension, launches in isolated profile.
REM
REM Usage:
REM   http-forge.bat [path]           Launch in "HTTP Forge" profile (test mode)
REM   http-forge.bat --dev [path]     Launch in "Default" profile (all extensions)
REM   http-forge.bat --both [path]    Launch BOTH profiles side by side

set PROFILE_TEST=HTTP Forge
set PROFILE_DEV=Default
set EXTENSION=henry-huang.http-forge
set INSTALL_DIR=%USERPROFILE%\.http-forge-launcher\vscode
set TEST_DATA_DIR=%USERPROFILE%\.http-forge-launcher\vscode-data

REM ─── Parse Arguments ───────────────────────────────────────────
set MODE=test
set WORKSPACE_ARGS=

:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="--dev" (
    set MODE=dev
    shift
    goto :parse_args
)
if "%~1"=="--test" (
    set MODE=test
    shift
    goto :parse_args
)
if "%~1"=="--both" (
    set MODE=both
    shift
    goto :parse_args
)
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
set WORKSPACE_ARGS=%WORKSPACE_ARGS% %1
shift
goto :parse_args
:end_parse

REM ─── Detect VS Code ───────────────────────────────────────────
set CODE_BIN=

REM Check known install locations first (more reliable than PATH)
if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd" (
    set "CODE_BIN=%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd"
    goto :found
)

if exist "%ProgramFiles%\Microsoft VS Code\bin\code.cmd" (
    set "CODE_BIN=%ProgramFiles%\Microsoft VS Code\bin\code.cmd"
    goto :found
)

if exist "%ProgramFiles(x86)%\Microsoft VS Code\bin\code.cmd" (
    set "CODE_BIN=%ProgramFiles(x86)%\Microsoft VS Code\bin\code.cmd"
    goto :found
)

REM Check our own install
if exist "%INSTALL_DIR%\bin\code.cmd" (
    set "CODE_BIN=%INSTALL_DIR%\bin\code.cmd"
    goto :found
)

REM Fallback: resolve full path from PATH
for /f "delims=" %%i in ('where code.cmd 2^>nul') do (
    set "CODE_BIN=%%i"
    goto :found
)

REM ─── Install VS Code ──────────────────────────────────────────
echo [http-forge] VS Code not found. Downloading...

set "INSTALLER=%TEMP%\VSCodeUserSetup-x64.exe"
curl -L --progress-bar "https://update.code.visualstudio.com/latest/win32-x64-user/stable" -o "%INSTALLER%"

if not exist "%INSTALLER%" (
    echo [http-forge] ERROR: Download failed. Please install VS Code manually.
    exit /b 1
)

echo [http-forge] Installing VS Code (silent, user-mode)...
"%INSTALLER%" /verysilent /mergetasks=!runcode,addtopath /dir="%INSTALL_DIR%"
del "%INSTALLER%" 2>nul

if exist "%INSTALL_DIR%\bin\code.cmd" (
    set "CODE_BIN=%INSTALL_DIR%\bin\code.cmd"
) else if exist "%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd" (
    set "CODE_BIN=%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd"
) else (
    echo [http-forge] ERROR: Failed to install VS Code.
    exit /b 1
)

:found
echo [http-forge] Using: %CODE_BIN%

REM Install extension only where it will actually be launched
echo [http-forge] Ensuring extension is installed...
if "%MODE%"=="test" call "%CODE_BIN%" --profile "%PROFILE_TEST%" --install-extension %EXTENSION% --force 2>nul
if "%MODE%"=="dev" call "%CODE_BIN%" --profile "%PROFILE_DEV%" --install-extension %EXTENSION% --force 2>nul
if "%MODE%"=="both" (
    if not exist "%TEST_DATA_DIR%\User" mkdir "%TEST_DATA_DIR%\User"
    if not exist "%TEST_DATA_DIR%\User\settings.json" (
        echo {"debug.showInActivityBar": false, "debug.showInStatusBar": "never", "workbench.startupEditor": "none"} > "%TEST_DATA_DIR%\User\settings.json"
    )
    call "%CODE_BIN%" --profile "%PROFILE_TEST%" --user-data-dir "%TEST_DATA_DIR%" --install-extension %EXTENSION% --force 2>nul
    call "%CODE_BIN%" --profile "%PROFILE_DEV%" --install-extension %EXTENSION% --force 2>nul
)

REM Built-in extensions to disable in test mode (not needed, saves RAM)
set DISABLE_EXT=--disable-extension ms-vscode.js-debug --disable-extension ms-vscode.js-debug-companion --disable-extension vscode.debug-auto-launch --disable-extension vscode.debug-server-ready

if "%MODE%"=="dev" goto :launch_dev
if "%MODE%"=="both" goto :launch_both

REM ─── Launch: test mode (default) ─────────────────────────────
echo [http-forge] Launching VS Code (profile: %PROFILE_TEST%)...
call "%CODE_BIN%" --new-window --profile "%PROFILE_TEST%" %DISABLE_EXT% %WORKSPACE_ARGS%
call "%CODE_BIN%" --profile "%PROFILE_TEST%" --open-url "vscode:extension/%EXTENSION%"
goto :eof

:launch_dev
echo [http-forge] Launching VS Code (profile: %PROFILE_DEV%)...
call "%CODE_BIN%" --new-window --profile "%PROFILE_DEV%" %WORKSPACE_ARGS%
call "%CODE_BIN%" --profile "%PROFILE_DEV%" --open-url "vscode:extension/%EXTENSION%"
goto :eof

:launch_both
echo [http-forge] Launching two separate instances...
echo   - Test: isolated instance (separate user-data-dir)
echo   - Dev:  profile "%PROFILE_DEV%"
REM Test instance
call "%CODE_BIN%" --new-window --profile "%PROFILE_TEST%" --user-data-dir "%TEST_DATA_DIR%" %DISABLE_EXT% %WORKSPACE_ARGS%
call "%CODE_BIN%" --profile "%PROFILE_TEST%" --user-data-dir "%TEST_DATA_DIR%" --open-url "vscode:extension/%EXTENSION%"
REM Dev instance
call "%CODE_BIN%" --new-window --profile "%PROFILE_DEV%" %WORKSPACE_ARGS%
call "%CODE_BIN%" --profile "%PROFILE_DEV%" --open-url "vscode:extension/%EXTENSION%"
goto :eof

:show_help
echo HTTP Forge Launcher
echo.
echo Usage: http-forge.bat [options] [workspace-path]
echo.
echo Options:
echo   --test   Launch with HTTP Forge profile (isolated, default)
echo   --dev    Launch with Default profile (all your extensions)
echo   --both   Launch two instances: Default + HTTP Forge (test)
echo   --help   Show this help
echo.
echo Default: Launch with "HTTP Forge" profile (isolated, test-only)
goto :eof
