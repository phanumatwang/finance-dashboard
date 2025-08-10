import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { format } from "date-fns";
import { generateQuotationPDF } from "../../generateQuotationPDF";

export default function ListQuotationPage() {
  const [quotations, setQuotations] = useState([]);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const dialogRef = useRef();

  useEffect(() => {
    const fetchQuotations = async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*, customers(name, address, tel)")
        .order("created_at", { ascending: false });
      if (!error) setQuotations(data);
    };
    fetchQuotations();
  }, []);

  const handleDownloadPDF = async (quotation) => {
    const customer = quotation.customers || {};
    const { url } = await generateQuotationPDF(quotation, customer, "/logo.jpg");

    setSelectedPdfUrl(url);
    setSelectedFileName(`ใบเสนอราคา-${customer.name}.pdf`);
    dialogRef.current?.showModal(); // ✅ เปิด popup
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
              <p>👤 ลูกค้า: {q.customers?.name || "-"}</p>
              <p>🧾 รายการ: {q.items?.length || 0} รายการ</p>
              <p className="amount-income">💵 {Number(q.total).toLocaleString()} บาท</p>
              <p>📝 หมายเหตุ: {q.note || "-"}</p>

              <button className="btn-view" onClick={() => handleDownloadPDF(q)}>
                🧾 ดู PDF
              </button>
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
