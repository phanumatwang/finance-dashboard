import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { format } from "date-fns";
import { generateQuotationPDF } from "../../generateQuotationPDF";
import { displayLatestNumber } from "../../utils/quotationNumber";
import CreateQuotationPage from "./CreateQuotationPage"; // ⬅️ ฟอร์มที่จะฝังในโมดัล

export default function ListQuotationPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  // โมดัล 2 ตัว: PDF + Editor
  const pdfDialogRef = useRef();
  const editorDialogRef = useRef();

  // บิลที่ถูกเลือก เพื่อส่งเข้าไปพรีฟิลในฟอร์ม
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const fetchQuotations = async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customers(name, address, tel)")
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(error.message || "โหลดข้อมูลไม่สำเร็จ");
      setQuotations([]);
    } else {
      setQuotations(data || []);
    }
    setLoading(false);
  };
  const filteredQuotations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quotations;

    return quotations.filter((row) => {
      const name = row.customers?.name?.toLowerCase() ?? "";
      const company = row.customers?.company_name?.toLowerCase() ?? "";
      const tel = row.customers?.tel ?? "";
      const note = (row.note ?? "").toLowerCase();
      const numberText = (displayLatestNumber(row.number) || "").toLowerCase();
      // จะค้นหาเลขที่/หมายเหตุด้วยก็ได้
      return (
        name.includes(q) ||
        company.includes(q) ||
        tel.includes(q) ||
        numberText.includes(q) ||
        note.includes(q)
      );
    });
  }, [quotations, search]);
  useEffect(() => {
    fetchQuotations();
    // ถ้าต้องการ realtime ให้เปิดคอมเมนต์บล็อกนี้ (ต้องเปิด Realtime บนตาราง)
    // const channel = supabase
    //   .channel("realtime:quotations")
    //   .on(
    //     "postgres_changes",
    //     { event: "*", schema: "public", table: "quotations" },
    //     () => fetchQuotations()
    //   )
    //   .subscribe();
    // return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDownloadPDF = async (e, quotation) => {
    e.stopPropagation();
    const customer = quotation.customers || {};
    try {
      const { url } = await generateQuotationPDF(
        quotation,
        customer,
        "/logo.jpg"
      );
      setSelectedPdfUrl(url);
      setSelectedFileName(`ใบเสนอราคา-${customer.name || "ลูกค้า"}.pdf`);
      pdfDialogRef.current?.showModal();
    } catch (err) {
      alert("สร้าง PDF ไม่สำเร็จ: " + (err?.message || err));
    }
  };

  // เปลี่ยนสถานะ (ไม่แตะ number)
  const updateStatus = async (e, q, status) => {
    e.stopPropagation();
    const payload = { status };
    // ถ้า DB มีคอลัมน์ updated_at ให้ใช้บรรทัดนี้
    // payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("quotations")
      .update(payload)
      .eq("id", q.id);

    if (error) return alert("อัปเดตไม่สำเร็จ: " + error.message);
    // อัปเดตเฉพาะตัวใน state ก็ได้ แต่เพื่อความชัวร์รีเฟรชทั้งรายการ
    fetchQuotations();
  };

  const downloadFile = () => {
    // ใช้ <a> ช่วยดาวน์โหลด
    const a = document.createElement("a");
    a.href = selectedPdfUrl;
    a.download = selectedFileName;
    a.click();
    // ❗ ไม่ revoke ตรงนี้ทันที เพื่อกันกรณีดาวน์โหลด/แสดงผลยังไม่เสร็จ
    // จะไป revoke ตอนปิด modal แทน
  };

  const closePdfDialog = () => {
    pdfDialogRef.current?.close();
    if (selectedPdfUrl) {
      // ปลอดภัย: ลบ objectURL ตอนปิด modal
      URL.revokeObjectURL(selectedPdfUrl);
    }
    setSelectedPdfUrl("");
    setSelectedFileName("");
  };

  // กดการ์ด → เปิดโมดัลฟอร์ม CreateQuotationPage
  const openEditorModal = (q) => {
    setSelectedQuotation(q || null);
    editorDialogRef.current?.showModal();
  };

  const closeEditorModal = (shouldRefresh = true) => {
    editorDialogRef.current?.close();
    setSelectedQuotation(null);
    if (shouldRefresh) fetchQuotations(); // รีเฟรช list หลังปิด (เช่น บันทึกเสร็จ)
  };

  return (
    <div className="report-root">
      <div
        className="customer-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>📑 ใบเสนอราคา</h2>
        <button
          className="btn btn-primary"
          onClick={() => openEditorModal(null)} // ⬅️ โหมด "สร้างใหม่"
          title="สร้างใบเสนอราคาใหม่"
        >
          ➕ เพิ่มใบเสนอราคา
        </button>
      </div>
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
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : loadError ? (
        <p style={{ color: "#dc2626" }}>เกิดข้อผิดพลาด: {loadError}</p>
      ) : filteredQuotations.length === 0 ? (
        <p>ไม่พบรายการที่ตรงกับ “{search}”</p>
      ) : (
        <ul className="report-list">
          {filteredQuotations.map((q) => (
            <li
              key={q.id}
              className="report-card income"
              onClick={() => openEditorModal(q)}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && openEditorModal(q)
              }
            >
              <div
                className="card-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p>
                  📅 <b>{format(new Date(q.created_at), "yyyy-MM-dd")}</b>
                </p>
                <span
                  className="status-badge"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#fff",
                    background:
                      q.status === "approved"
                        ? "#12481c"
                        : q.status === "rejected"
                        ? "#dc2626"
                        : "#6b7280",
                  }}
                >
                  {q.status || "draft"}
                </span>
              </div>

              <p>เลขที่: {displayLatestNumber(q.number) || "-"}</p>
              <p>👤 ลูกค้า: {q.customers?.name || "-"}</p>
              <p>
                🧾 รายการ: {Array.isArray(q.items) ? q.items.length : 0} รายการ
              </p>
              <p className="amount-income">
                💵 {Number(q.total || 0).toLocaleString()} บาท
              </p>
              <p>📝 หมายเหตุ: {q.note || "-"}</p>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn-view"
                  onClick={(e) => handleDownloadPDF(e, q)}
                >
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
          }}
        >
          <button className="btn-view" onClick={closePdfDialog}>
            ❌ ปิด
          </button>
          <button
            className="btn-view"
            onClick={downloadFile}
            disabled={!selectedPdfUrl}
          >
            ⬇️ ดาวน์โหลด
          </button>
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
      <dialog
        ref={editorDialogRef}
        style={{ width: "95%", height: "95%", padding: 0 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: 8,
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontWeight: 600 }}>
            🧾 {selectedQuotation ? "แก้ไขใบเสนอราคา" : "สร้างใบเสนอราคา"}
          </div>
          <button className="btn-view" onClick={() => closeEditorModal(false)}>
            ❌ ปิด
          </button>
        </div>
        <div
          style={{ height: "calc(100% - 44px)", overflow: "auto", padding: 12 }}
        >
          <CreateQuotationPage
            key={selectedQuotation?.id || "new"} // ✅ force re-mount เมื่อเลือกการ์ดใหม่/สร้างใหม่
            quotationData={selectedQuotation} // null = โหมดสร้างใหม่
            onClose={() => closeEditorModal(true)} // ✅ ให้ฟอร์มปิด modal + รีเฟรช list หลังบันทึก
          />
        </div>
      </dialog>
    </div>
  );
}
