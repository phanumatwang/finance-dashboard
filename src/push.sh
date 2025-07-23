#!/bin/bash

# ✅ ใช้ข้อความ commit จาก argument ถ้าไม่ใส่ จะใช้ค่า default
COMMIT_MSG=${1:-"🔄 Auto commit & deploy"}

echo "🚀 กำลัง Add ไฟล์ทั้งหมด..."
git add .

echo "📝 Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "⬆️ Push ขึ้น GitHub..."
git push origin main

echo "✅ เสร็จแล้ว! ถ้าผูกกับ Vercel จะ Deploy อัตโนมัติ 🎉"
