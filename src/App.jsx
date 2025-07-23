import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AddPage from "./pages/AddPage";
import BalancePage from "./pages/BalancePage";
import ReportPage from "./pages/ReportPage";
import BottomNav from "./components/BottomNav";
import AuthKey from "./pages/AuthKey";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import PayrollPage from "./pages/PayrollPage";
import OTApprovePage from "./pages/OTApprovePage";
import OTRequestPage from "./pages/OTRequestPage";
import "./theme.css";
export default function App() {
  const userName = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  console.log("🚀 userName:", userName, "role:", role);
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert("⏳ ระบบจะออกอัตโนมัติ");
        localStorage.clear();
        window.location.reload(); // redirect ไปหน้า AuthKey
      }, 10 * 60 * 1000); // ✅ 10 นาที = 600,000 ms
    };

    // ✅ Event ที่จะรีเซ็ตเวลา
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // ✅ เริ่มจับเวลา
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(timer);
    };
  }, []);

  // ✅ ถ้ายังไม่มีการ Login → ไป AuthKey
  if (!userName || !role) {
    return <AuthKey />;
  }
 

  return (
    <div className="app-root">
      {/* ✅ Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5rem 1rem",
          background: "#eee",
        }}
      >
        <div>
          👤 <b>{userName}</b> ({role})
        </div>
        <button
          style={{
           
            color: "#fff",
            padding: "6px 12px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={() => {
            localStorage.clear();
            window.location.reload();
            
          }}
        >
          🚪 Logout
        </button>
      </div>

       <Routes>
        {/* ✅ ถ้าเป็น superadmin/admin → หน้า Dashboard | ถ้า viewer → AddPage */}
        <Route
          path="/"
          element={
            role === "user" ? <TimeTrackingPage /> : <DashboardPage />
          }
        />

        {/* ✅ viewer เห็นได้เฉพาะ add & report */}
        <Route path="/add" element={<AddPage />} />
        <Route path="/report" element={<ReportPage />} />

        {/* ✅ ส่วนนี้เฉพาะ admin/superadmin */}
        {(role === "superadmin" || role === "admin") && (
          <>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/balance" element={<BalancePage />} />
            <Route path="/time-tracking-report" element={<PayrollPage />} />
            {/* ใส่เอกสาร/อื่นๆ ได้ที่นี่ */}
          </>
        )}

        {/* ❌ ถ้า viewer พยายามเข้า path อื่น → ส่งกลับ /add */}
        {role === "user" && (
          <Route path="*" element={<Navigate to="/add" />} />
        )}
        <Route path="/time-tracking" element={<TimeTrackingPage />} />
         <Route
          path="/ot-tracking"
          element={
            role === "user" ? <OTRequestPage /> : <OTApprovePage />
          }
        />
       
       
      </Routes>

      {/* ✅ ส่ง role ไป BottomNav เพื่อซ่อนเมนู */}
      <BottomNav role={role} />
    </div>
  );
}
