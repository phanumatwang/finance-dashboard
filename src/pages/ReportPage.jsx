import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./ReportPage.css"; // ✅ เพิ่มไฟล์ CSS

export default function ReportPage() {
  const [transactions, setTransactions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) console.error("❌ Fetch error:", error.message);
    else setTransactions(data);
  }

  return (
    <div className="report-root">
      <h2>📊 รายงาน</h2>

      {transactions.length === 0 ? (
        <p>ไม่มีข้อมูล</p>
      ) : (
        <ul className="report-list">
          {transactions.map((item) => (
            <li
              key={item.id}
              className={`report-card ${
                item.category === "รายรับ" ? "income" : "expense"
              }`}
            >
              <p>
                📅 <b>{item.date}</b>
              </p>
              <p>📂 หมวดหมู่: {item.category}</p>
              <p>📝 รายละเอียด: {item.description}</p>
              <p
                className={
                  item.category === "รายรับ"
                    ? "amount-income"
                    : "amount-expense"
                }
              >
                💵 {item.amount.toLocaleString()} บาท
              </p>

              {item.file_url && (
                <button
                  className="btn-view"
                  onClick={() => setSelectedImage(item.file_url)}
                >
                  👁️ View รูปภาพ
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ✅ Popup รูปภาพ */}
      {selectedImage && (
        <div className="popup-overlay" onClick={() => setSelectedImage(null)}>
          <div className="popup-content">
            <img src={selectedImage} alt="แนบไฟล์" />
            <button
              className="btn-close"
              onClick={() => setSelectedImage(null)}
            >
              ❌ ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
