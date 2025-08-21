import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import "./CustomerListPage.css";
import AddCustomerPage from "./AddCustomerPage";
export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false });

    if (error) console.error("❌ Error loading customers:", error.message);
    else setCustomers(data || []);

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ ต้องการลบลูกค้านี้หรือไม่?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) alert("❌ ลบไม่สำเร็จ: " + error.message);
    else setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.company_name || "").toLowerCase().includes(q) ||
      (c.tel || "").includes(q)
    );
  });

  return (
    <div className="report-root">
      <div className="customer-page">
        {/* Header */}
        <div className="customer-header">
          <h1>📋 รายชื่อลูกค้า</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            ➕ เพิ่มลูกค้า
          </button>
        </div>
        {showModal && (
          <AddCustomerPage isModal={true} onClose={() => setShowModal(false)} />
        )}
        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="ค้นหาชื่อ, บริษัท, เบอร์โทร"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="card-list">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="customer-card skeleton"
                style={{ height: 96 }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">ไม่มีข้อมูลลูกค้า</div>
        ) : (
          <ul className="card-list">
            {filtered.map((c) => (
              <li key={c.id} className="customer-card">
                <span className="accent" />
                <div className="card-top">
                  <div className="title">{c.name || "-"}</div>
                  <span className="badge">Logo</span>
                </div>

                <div className="info-grid">
                  <div>
                    🏢 <span className="strong">{c.company_name || "-"}</span>
                  </div>
                  <div>
                    📞 <span className="strong">{c.tel || "-"}</span>
                  </div>
                  <div>
                    🧾 ประเภท: <span className="strong">{c.type || "-"}</span>
                  </div>
                  {c.address && (
                    <div className="truncate">
                      📍 <span className="strong">{c.address}</span>
                    </div>
                  )}
                </div>

                <div className="divider" />

                <div className="actions">
                  {/* เพิ่มปุ่มอื่นภายหลังได้ เช่น ดู/แก้ไข */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn btn-primary"
                  >
                    🗑 ดูข้อมูล
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn btn-danger"
                  >
                    🗑 แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="btn btn-delete"
                  >
                    🗑 ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
