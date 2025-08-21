@echo off
setlocal

REM รับข้อความ commit ทั้งหมด (รวมเว้นวรรค)
set msg=%*
if "%msg%"=="" set msg=🔄 Auto commit & deploy

echo 🚀 Add files...
git add .

echo 📝 Commit: %msg%
git commit -m "%msg%"

echo ⬇️ Pull --rebase...
git pull --rebase origin main

echo ⬆️ Push...
git push origin main

echo ✅ Done! If linked with Vercel, it will deploy automatically 🎉
endlocal
