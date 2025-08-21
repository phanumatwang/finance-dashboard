@echo off
setlocal

:: รวม argument ทั้งหมดเป็นข้อความเดียว
set COMMIT_MSG=%*

if "%COMMIT_MSG%"=="" set COMMIT_MSG=Auto commit & deploy

echo 🚀 กำลัง Add ไฟล์ทั้งหมด...
git add .

echo 📝 Commit: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"

echo ⬆️ Push ขึ้น GitHub...
git push origin main

echo ✅ เสร็จแล้ว! ถ้าผูกกับ Vercel จะ Deploy อัตโนมัติ 🎉
endlocal
npm run deploy -- "fix bug in customer list modal"
