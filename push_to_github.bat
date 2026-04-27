@echo off
echo Pushing changes to GitHub...
git add .
git commit -m "fix: active links on homepage and sync color themes"
git push origin main
echo.
echo ========================================================
echo Done! Your code is now live on GitHub.
echo The actual website will update in about 40 seconds.
echo Production URL: https://jiyanshud22.github.io/MOVEASY-WEBSITE/
echo ========================================================
pause
