import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./BottomNav.css";

export default function BottomNav({ role }) {
  const [openMenu, setOpenMenu] = useState(null);

  // toggle เมนู
  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  return (
    <div className="bottom-nav-wrapper">
      {/* ✅ เมนูย่อยของ "การเงิน" */}
      {openMenu === "finance" && (
        <div className="submenu">
          <span className="submenu-title">การเงิน</span>

          {/* ✅ ทุก role เข้าได้ */}
          <NavLink
            to="/add"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            ➕ บันทึกรายการ รายรับ-รายจ่าย
          </NavLink>

          {/* ✅ viewer เห็นเฉพาะ add & report */}
          {(role === "superadmin" || role === "admin") && (
            <NavLink
              to="/balance"
              className="submenu-item"
              onClick={() => setOpenMenu(null)}
            >
              📊 งบดุล
            </NavLink>
          )}

          {/* ✅ ทุก role เข้าได้ */}
          <NavLink
            to="/report"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            📑 รายงาน รายรับ-รายจ่าย
          </NavLink>
        </div>
      )}

      {/* ✅ เมนูย่อยของ "เอกสาร" (เฉพาะ superadmin/admin) */}
      {openMenu === "docs" && (role === "superadmin" || role === "admin") && (
        <div className="submenu">
          <span className="submenu-title">เอกสาร</span>
          <NavLink
            to="/quotation"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            📝 ใบเสนอราคา
          </NavLink>
          <NavLink
            to="/invoice"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            📄 ใบแจ้งหนี้
          </NavLink>
          <NavLink
            to="/docs/add"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            ➕ เพิ่มรายการ
          </NavLink>
        </div>
      )}

      {/* ✅ เมนูย่อยของ "อื่นๆ" (เฉพาะ superadmin/admin) */}
      {openMenu === "other" && (
        <div className="submenu">
          <span className="submenu-title">อื่นๆ</span>
          <NavLink
            to="/company-profile"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            🏢 ข้อมูลบริษัท
          </NavLink>
          <NavLink
            to="/time-tracking"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            ⏱️ บันทึกเวลาทำงาน
          </NavLink>
           {(role === "superadmin" || role === "admin") && (
          <NavLink
            to="/time-tracking-report"
            className="submenu-item"
            onClick={() => setOpenMenu(null)}
          >
            📄 รายงานเวลาทำงาน
          </NavLink>
           )}
        </div>
      )}

      {/* ✅ Bottom Navbar หลัก */}
      <div className="bottom-nav">
        {/* ✅ viewer ไม่มีหน้าหลัก แสดงเฉพาะ superadmin/admin */}
        {(role === "superadmin" || role === "admin") && (
          <NavLink
            to="/"
            className="nav-item"
            onClick={() => setOpenMenu(null)}
          >
            <span className="nav-icon">🏠</span>
            <span>หน้าหลัก</span>
          </NavLink>
        )}

        {/* ✅ กดแล้ว toggle เมนู "การเงิน" */}
        <button className="nav-item" onClick={() => toggleMenu("finance")}>
          <span className="nav-icon">💰</span>
          <span>การเงิน</span>
        </button>

        {/* ✅ viewer ซ่อนไว้ */}
        {(role === "superadmin" || role === "admin") && (
          <>
            {/* ✅ กดแล้ว toggle เมนู "เอกสาร" */}
            <button className="nav-item" onClick={() => toggleMenu("docs")}>
              <span className="nav-icon">📄</span>
              <span>เอกสาร</span>
            </button>

            {/* ✅ กดแล้ว toggle เมนู "อื่นๆ" */}
          </>
        )}
        <button className="nav-item" onClick={() => toggleMenu("other")}>
          <span className="nav-icon">⚙️</span>
          <span>อื่นๆ</span>
        </button>
      </div>
    </div>
  );
}
