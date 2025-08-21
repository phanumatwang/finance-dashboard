@echo off
setlocal

:: รวม argument ทั้งหมดเป็นข้อความเดียว
set COMMIT_MSG=%*

if "%COMMIT_MSG%"=="" set COMMIT_MSG=Auto commit & deploy


git add .

echo 📝 Commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"

echo ⬆️ Push ขึ้น GitHub...
git push origin main


endlocal

