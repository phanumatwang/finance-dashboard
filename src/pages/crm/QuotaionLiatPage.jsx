import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { format } from "date-fns";
import { generateQuotationPDF } from "../../generateQuotationPDF";

// ✅ ฟังก์ชันคำนวณเลข Revision
function nextRevisionNumber(no = "") {
  // ตัดช่องว่างและเช็คว่ามี -R อยู่แล้วไหม
  const m = /^(.*?)(?:-R(\d+))?$/.exec(no.trim());
  const base = (m && m[1]) || no.trim();
  const next = m && m[2] ? parseInt(m[2], 10) + 1 : 1;
  return `${base}-R${next}`;
}

export default function ListQuotationPage() {
  const [quotations, setQuotations] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const dialogRef = useRef();

  const fetchQuotations = async () => {
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customers(name, address, tel)")
      .order("created_at", { ascending: false });
    if (!error) setQuotations(data || []);
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleDownloadPDF = async (quotation) => {
    const customer = quotation.customers || {};
    const { url } = await generateQuotationPDF(quotation, customer, "/logo.jpg");

    setSelectedPdfUrl(url);
    setSelectedFileName(`ใบเสนอราคา-${customer.name}.pdf`);
    dialogRef.current?.showModal();
  };

  // ✅ กดแก้ไข -> เพิ่ม R และอัปเดตฐานข้อมูล
  const handleEdit = async (q) => {
    const newNo = nextRevisionNumber(q.number || "");
    const ok = confirm(`ยืนยันแก้ไขใบเสนอราคา?\nระบบจะเปลี่ยนเลขที่เป็น: ${newNo}`);
    if (!ok) return;

    const { error } = await supabase
      .from("quotations")
      .update({
        number: newNo,
        status: "revised",                 // ใส่สถานะใหม่เผื่อใช้งานต่อ
        updated_at: new Date().toISOString()
      })
      .eq("id", q.id);

    if (error) {
      alert("อัปเดตเลขที่ไม่สำเร็จ: " + error.message);
      return;
    }

    alert("อัปเดตเรียบร้อย");
    fetchQuotations();
    // ถ้ามีหน้าแก้ไขจริง ๆ ให้พาไปหน้านั้นได้ (ปรับ path ให้ตรงโปรเจ็กต์)
    // window.location.href = `/crm/create-quotation?id=${q.id}`;
  };

  const downloadFile = () => {
    const a = document.createElement("a");
    a.href = selectedPdfUrl;
    a.download = selectedFileName;
    a.click();
    URL.revokeObjectURL(selectedPdfUrl);
    setSelectedPdfUrl("");
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    setSelectedPdfUrl("");
  };

  return (
    <div className="report-root">
      <h2>📑 ใบเสนอราคา</h2>
      {quotations.length === 0 ? (
        <p>ไม่มีข้อมูล</p>
      ) : (
        <ul className="report-list">
          {quotations.map((q) => (
            <li key={q.id} className="report-card income">
              <div className="card-header">
                <p>📅 <b>{format(new Date(q.created_at), "yyyy-MM-dd")}</b></p>
              </div>
              <p>เลขที่: {q.number || "-"}</p>
              <p>👤 ลูกค้า: {q.customers?.name || "-"}</p>
              <p>🧾 รายการ: {q.items?.length || 0} รายการ</p>
              <p className="amount-income">💵 {Number(q.total).toLocaleString()} บาท</p>
              <p>📝 หมายเหตุ: {q.note || "-"}</p>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn-view" onClick={() => handleDownloadPDF(q)}>
                  🧾 ดู PDF
                </button>
                <button className="btn-view" style={{ background:'#d9534f' }} onClick={() => handleEdit(q)}>
                  ✏️ แก้ไข
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ✅ Popup Modal HTML5 */}
      <dialog ref={dialogRef} style={{ width: "90%", height: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <button className="btn-view" onClick={closeDialog}>❌ ปิด</button>
          <button className="btn-view" onClick={downloadFile}>⬇️ ดาวน์โหลด</button>
        </div>
        {selectedPdfUrl && (
          <iframe
            src={selectedPdfUrl}
            width="100%"
            height="90%"
            style={{ border: "1px solid #ccc" }}
            title="ใบเสนอราคา"
          />
        )}
      </dialog>
    </div>
  );
}
