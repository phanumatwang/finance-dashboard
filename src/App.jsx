import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import AddPage from "./pages/AddPage";
import BalancePage from "./pages/BalancePage";
import ReportPage from "./pages/ReportPage";
import BottomNav from "./components/BottomNav";
import "./theme.css";
export default function App() {
  return (
    <div className="app-root">
      <Routes>
        {/* ✅ เมนูย่อยของ การเงิน */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/category" element={<div>CategoryPage (ยังไม่ทำ)</div>} />
        <Route path="/balance" element={<BalancePage />} />
        <Route path="/report" element={<ReportPage />} />

        {/* ✅ เมนูหลักอื่นๆ */}
        <Route path="/docs" element={<div>📄 เอกสาร</div>} />
       

        <Route path="/company-profile" element={<div>🏢 ข้อมูลบริษัท</div>} />
        <Route path="/time-tracking" element={<div>⏱️ บันทึกเวลาทำงาน</div>} /> 
      </Routes>

      {/* ✅ Bottom Navbar อยู่ล่างสุดตลอด */}
      <BottomNav />
    </div>
  );
}
