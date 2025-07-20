import "./Drawer.css";

export default function Drawer({ open, onClose }) {
  return (
    <div className={`drawer-overlay ${open ? "show" : ""}`} onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <h3>เมนู</h3>
        <a href="/">การเงิน</a>
        <a href="/docs">เอกสาร</a>
        <a href="/settings">ตั้งค่า</a>
      </div>
    </div>
  );
}
