import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./ReportPage.css";

export default function ReportPage() {
  const [transactions, setTransactions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const userName = localStorage.getItem("username");
  const role = localStorage.getItem("role"); // ✅ เอา role มาเช็คสิทธิ์

  useEffect(() => {
    fetchTransactions();
  },[]);

  async function fetchTransactions() {
    let query = supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });

    // ✅ ถ้าเป็น user (viewer) → เห็นเฉพาะของตัวเอง
    if (role === "user") {
      query = query.eq("created_by", userName);
    }

    const { data, error } = await query;

    if (error) console.error("❌ Fetch error:", error.message);
    else setTransactions(data);
  }

  async function handleDelete(id, fileUrl) {
    if (!window.confirm("⚠️ คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;

    // ✅ ถ้ามีไฟล์แนบ → ลบใน storage ก่อน
    if (fileUrl) {
      const storagePath = extractStoragePath(fileUrl);
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("uploads")
          .remove([storagePath]);

        if (storageError)
          console.warn("⚠️ ลบไฟล์ไม่สำเร็จ:", storageError.message);
      }
    }

    // ✅ ลบข้อมูลจาก table
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      alert("❌ ลบไม่สำเร็จ: " + error.message);
    } else {
      alert("✅ ลบสำเร็จ!");
      fetchTransactions(); // โหลดข้อมูลใหม่
    }
  }

  // ✅ helper แยก path จาก URL
  function extractStoragePath(fileUrl) {
    const parts = fileUrl.split("/uploads/");
    return parts[1] ? parts[1] : null;
  }

  async function approveRequest(id) {
    const { error } = await supabase
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) alert("❌ อนุมัติไม่สำเร็จ");
    else {
      alert("✅ อนุมัติสำเร็จ!");
      fetchTransactions(); // refresh list
    }
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
              {/* ✅ ส่วนหัวการ์ด */}
              <div className="card-header">
                <p>
                  📅 <b>{item.date}</b>
                </p>
                {(role === "admin" || role === "superadmin") &&
                  item.status === "pending" && (
                    <button
                      className="btn-approve"
                      onClick={() => approveRequest(item.id)}
                    >
                      ✅ อนุมัติ
                    </button>
                  )}
              </div>

              <p>📂 {item.category}</p>
              <p>📝 {item.description}</p>
              <p
                className={
                  item.category === "รายรับ"
                    ? "amount-income"
                    : "amount-expense"
                }
              >
                💵 {item.amount.toLocaleString()} บาท
              </p>

              <p>
                ✅ สถานะ:{" "}
                {item.status === "approved" ? "✔️ อนุมัติแล้ว" : "⏳ รออนุมัติ"}
              </p>

              {/* ✅ ปุ่ม View รูปภาพ อยู่ด้านบน (ถ้ามีไฟล์) */}
              {item.file_url && (
                <button
                  className="btn-view"
                  onClick={() => setSelectedImage(item.file_url)}
                >
                  👁️ View รูปภาพ
                </button>
              )}

              {/* ✅ ปุ่มลบ ลอยล่างขวา เฉพาะ superadmin */}
              {role === "superadmin" && (
                <div className="card-delete-footer">
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(item.id, item.file_url)}
                  >
                    🗑️ ลบ
                  </button>
                </div>
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
