import { useState } from "react";
import "./AuthKey.css";

export default function AuthKey() {
  const [keyInput, setKeyInput] = useState("");

  const handleLogin = () => {
    const superadmins = import.meta.env.VITE_SUPERADMINS_KEYS?.split(",") || [];
    const admins = import.meta.env.VITE_ADMINS_KEYS?.split(",") || [];
    const users = import.meta.env.VITE_USER_KEYS?.split(",") || [];

    let found = false;

    const checkKey = (keys, role) => {
      for (const entry of keys) {
        const [name, key, wage] = entry.split(":");
        if (keyInput === key) {
          localStorage.setItem("username", name);
          localStorage.setItem("role", role);
          localStorage.setItem("wage", wage);
          found = true;
          window.location.reload();
          break;
        }
      }
    };

    checkKey(superadmins, "superadmin");
    if (!found) checkKey(admins, "admin");
    if (!found) checkKey(users, "user");

    if (!found) alert("❌ รหัสไม่ถูกต้อง");
  };

  return (
    <div className="auth-center">
      <h2>🔒 เข้าสู่ระบบ</h2>
      <div className="auth-form">
        <input
          type="password"
          placeholder="กรอก Key..."
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />
        <button onClick={handleLogin}>✅ ยืนยัน</button>
      </div>
    </div>
  );
}
