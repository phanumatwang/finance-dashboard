import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { format } from "date-fns";
import { generateQuotationPDF } from "../../generateQuotationPDF";
import { displayLatestNumber } from "../../utils/quotationNumber";
import CreateQuotationPage from "./CreateQuotationPage"; // ⬅️ ฟอร์มที่จะฝังในโมดัล

export default function ListQuotationPage() {
  const [quotations, setQuotations] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  // โมดัล 2 ตัว: PDF + Editor
  const pdfDialogRef = useRef();
  const editorDialogRef = useRef();

  // บิลที่ถูกเลือก เพื่อส่งเข้าไปพรีฟิลในฟอร์ม
  const [selectedQuotation, setSelectedQuotation] = useState(null);

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

  const handleDownloadPDF = async (e, quotation) => {
    e.stopPropagation();
    const customer = quotation.customers || {};
    const { url } = await generateQuotationPDF(quotation, customer, "/logo.jpg");
    setSelectedPdfUrl(url);
    setSelectedFileName(`ใบเสนอราคา-${customer.name || "ลูกค้า"}.pdf`);
    pdfDialogRef.current?.showModal();
  };

  // เปลี่ยนสถานะ (ไม่แตะ number)
  const updateStatus = async (e, q, status) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("quotations")
      // ❗ ถ้า DB ยังไม่มี updated_at ให้ลบบรรทัดนั้นทิ้ง
      .update({ status /*, updated_at: new Date().toISOString()*/ })
      .eq("id", q.id);
    if (error) return alert("อัปเดตไม่สำเร็จ: " + error.message);
    fetchQuotations();
  };

  const downloadFile = () => {
    const a = document.createElement("a");
    a.href = selectedPdfUrl;
    a.download = selectedFileName;
    a.click();
    URL.revokeObjectURL(selectedPdfUrl);
    setSelectedPdfUrl("");
  };

  const closePdfDialog = () => {
    pdfDialogRef.current?.close();
    setSelectedPdfUrl("");
  };

  // กดการ์ด → เปิดโมดัลฟอร์ม CreateQuotationPage
  const openEditorModal = (q) => {
    setSelectedQuotation(q);
    editorDialogRef.current?.showModal();
  };

  const closeEditorModal = () => {
    editorDialogRef.current?.close();
    setSelectedQuotation(null);
    fetchQuotations(); // รีเฟรช list หลังปิด (เช่น บันทึกเสร็จ)
  };

  return (
    <div className="report-root">
      <h2>📑 ใบเสนอราคา</h2>
      {quotations.length === 0 ? (
        <p>ไม่มีข้อมูล</p>
      ) : (
        <ul className="report-list">
          {quotations.map((q) => (
            <li
              key={q.id}
              className="report-card income"
              onClick={() => openEditorModal(q)}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openEditorModal(q)}
            >
              <div
                className="card-header"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <p>📅 <b>{format(new Date(q.created_at), "yyyy-MM-dd")}</b></p>
                <span
                  className="status-badge"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#fff",
                    background:
                      q.status === "approved" ? "#07881f" :
                      q.status === "rejected" ? "#dc2626" : "#6b7280",
                  }}
                >
                  {q.status || "draft"}
                </span>
              </div>

              <p>เลขที่: {displayLatestNumber(q.number) || "-"}</p>
              <p>👤 ลูกค้า: {q.customers?.name || "-"}</p>
              <p>🧾 รายการ: {q.items?.length || 0} รายการ</p>
              <p className="amount-income">💵 {Number(q.total || 0).toLocaleString()} บาท</p>
              <p>📝 หมายเหตุ: {q.note || "-"}</p>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn-view" onClick={(e) => handleDownloadPDF(e, q)}>
                  🧾 ดู PDF
                </button>

                {/* อนุมัติ / ไม่อนุมัติ - ไม่เปลี่ยนเลข */}
                <button
                  className="btn-view"
                  style={{ background: "#16a34a" }}
                  onClick={(e) => updateStatus(e, q, "approved")}
                >
                  ✅ อนุมัติ
                </button>
                <button
                  className="btn-view"
                  style={{ background: "#dc2626" }}
                  onClick={(e) => updateStatus(e, q, "rejected")}
                >
                  ❌ ไม่อนุมัติ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal: ดู PDF */}
      <dialog ref={pdfDialogRef} style={{ width: "90%", height: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <button className="btn-view" onClick={closePdfDialog}>❌ ปิด</button>
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

      {/* Modal: ฟอร์ม Create/Edit (ฝังหน้า /quot/add) */}
      <dialog ref={editorDialogRef} style={{ width: "95%", height: "95%", padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 600 }}>🧾 แก้ไข/สร้างใบเสนอราคา</div>
          <button className="btn-view" onClick={closeEditorModal}>❌ ปิด</button>
        </div>
        <div style={{ height: "calc(100% - 44px)", overflow: "auto", padding: 12 }}>
          <CreateQuotationPage
            key={selectedQuotation?.id || "new"}   // ✅ force re-mount เมื่อเลือกการ์ดใหม่
            quotationData={selectedQuotation} 
                 // ✅ ส่ง props เพื่อพรีฟิล
            onClose={closeEditorModal}             // ✅ ให้ฟอร์มปิด modal ได้เองหลังบันทึก
          />
        </div>
      </dialog>
    </div>
  );
}
