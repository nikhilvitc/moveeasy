@echo off
cd /d "%~dp0.."
echo Working in: %CD%
git add -A
git status
set /p MSG=Commit message (or press Enter for default): 
if "%MSG%"=="" set MSG=chore: deploy
git commit -m "%MSG%"
if errorlevel 1 (
  echo No commit created — maybe nothing to commit. Continuing to push/deploy...
)
git push origin main
call npm run deploy:hosting
pause
