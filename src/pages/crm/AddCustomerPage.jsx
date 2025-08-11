import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

export default function AddCustomerPage({ onClose, onSave }) {
  const [customerType, setCustomerType] = useState("บุคคลทั่วไป");
  const [langTab, setLangTab] = useState("th"); // th | en

  const [saving, setSaving] = useState(false);
  function getCurrentUser() {
    const name = localStorage.getItem("username") || null;
    const role = localStorage.getItem("role") || null;
    return { name, role };
  }

  const [formData, setFormData] = useState({
    th: {
      name: "",
      companyName: "",
      contactName: "",
      position: "",
      phone: "",
      lineId: "",
      address: "",
      note: "",
    },
    en: {
      name: "",
      companyName: "",
      contactName: "",
      position: "",
      phone: "",
      lineId: "",
      address: "",
      note: "",
    },
  });

  const handleChange = (lang, key, value) => {
    setFormData((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [key]: value },
    }));
  };

  const buildDisplayName = (lang) => {
    const d = formData[lang];
    if (customerType === "บุคคลทั่วไป") return d.name?.trim();
    const company = d.companyName?.trim();
    const contact = d.contactName?.trim();
    if (company && contact) return `${company} (${contact})`;
    return company || contact || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // กันกดซ้ำ
    setSaving(true);
    try {
      const name_th = buildDisplayName("th");
      const name_en = buildDisplayName("en");
      const primaryName = name_th || name_en;
      const primaryPhone = formData.th.phone || formData.en.phone;

      if (!primaryName || !primaryPhone) {
        alert("❗ กรุณากรอก 'ชื่อ' และ 'เบอร์โทร' อย่างน้อยในหนึ่งภาษา");
        return;
      }

      const { name: currentUserName } = getCurrentUser();
      const payload = {
        name: primaryName,
        tel: primaryPhone,
        type: customerType,
        company_name:
          customerType === "บริษัท" ? formData.th.companyName || null : null,
        contact_name:
          customerType === "บริษัท" ? formData.th.contactName || null : null,
        position:
          customerType === "บริษัท" ? formData.th.position || null : null,
        line_id: formData.th.lineId || null,
        address: formData.th.address || "",
        note: formData.th.note || "",
        name_en: name_en || null,
        company_name_en:
          customerType === "บริษัท" ? formData.en.companyName || null : null,
        contact_name_en:
          customerType === "บริษัท" ? formData.en.contactName || null : null,
        position_en:
          customerType === "บริษัท" ? formData.en.position || null : null,
        line_id_en: formData.en.lineId || null,
        address_en: formData.en.address || "",
        note_en: formData.en.note || "",
        created_by: currentUserName,
      };

      const { error } = await supabase.from("customers").insert([payload]);
      if (error) throw error;

      alert("✅ บันทึกลูกค้าเรียบร้อยแล้ว");
      onSave?.(primaryName);
      onClose?.();
    } catch (err) {
      alert("❌ บันทึกลูกค้าไม่สำเร็จ: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };
  const L = langTab; // ภาษาที่กำลังแก้ใน UI

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-100 p-0">
        <div className="px-5 pt-5 pb-3 border-b">
          <h2 className="font-bold text-xl text-primary">
            ➕ เพิ่มลูกค้าใหม่ (ไทย/English)
          </h2>
        </div>

        {/* ตัวสลับภาษา */}
        <div className="flex items-center gap-2 mb-4">
          <div className="join">
            <button
              className={`btn btn-sm join-item ${
                langTab === "th" ? "btn-primary" : "btn-outline"
              }`}
              type="button"
              onClick={() => setLangTab("th")}
            >
              ไทย
            </button>
            <button
              className={`btn btn-sm join-item ${
                langTab === "en" ? "btn-primary" : "btn-outline"
              }`}
              type="button"
              onClick={() => setLangTab("en")}
            >
              English
            </button>
          </div>
          <span className="opacity-70 text-sm">
            กรอกได้ทั้งสองภาษา — ระบบจะใช้ค่าที่มีอย่างน้อยหนึ่งภาษา
          </span>
        </div>

        <form onSubmit={handleSubmit} className="add-form flex flex-col gap-3">
          {/* ประเภทลูกค้า */}
          <label className="flex flex-col gap-2">
            <span>ประเภทลูกค้า</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${
                  customerType === "บุคคลทั่วไป" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => setCustomerType("บุคคลทั่วไป")}
              >
                บุคคลทั่วไป
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  customerType === "บริษัท" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => setCustomerType("บริษัท")}
              >
                บริษัท / Company
              </button>
            </div>
          </label>

          {/* ฟอร์มตามภาษา + ประเภท */}
          {customerType === "บุคคลทั่วไป" ? (
            <>
              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "ชื่อ-นามสกุล (ไทย)" : "Full Name (English)"}
                </span>
                <input
                  value={formData[L].name}
                  onChange={(e) => handleChange(L, "name", e.target.value)}
                  placeholder={
                    L === "th" ? "เช่น นายสมชาย ใจดี" : "e.g., John Smith"
                  }
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span>{L === "th" ? "เบอร์โทร" : "Phone"}</span>
                  <input
                    type="tel"
                    value={formData[L].phone}
                    onChange={(e) => handleChange(L, "phone", e.target.value)}
                    placeholder={L === "th" ? "เบอร์มือถือ" : "Mobile"}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>LINE ID (optional)</span>
                  <input
                    value={formData[L].lineId}
                    onChange={(e) => handleChange(L, "lineId", e.target.value)}
                    placeholder="Line ID"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "ที่อยู่ (optional)" : "Address (optional)"}
                </span>
                <input
                  value={formData[L].address}
                  onChange={(e) => handleChange(L, "address", e.target.value)}
                  placeholder={
                    L === "th"
                      ? "บ้านเลขที่ ถนน เขต/อำเภอ จังหวัด"
                      : "Street, City, State"
                  }
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "หมายเหตุ (optional)" : "Note (optional)"}
                </span>
                <input
                  value={formData[L].note}
                  onChange={(e) => handleChange(L, "note", e.target.value)}
                  placeholder={
                    L === "th" ? "รายละเอียดเพิ่มเติม" : "Additional details"
                  }
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "ชื่อบริษัท (ไทย)" : "Company Name (English)"}
                </span>
                <input
                  value={formData[L].companyName}
                  onChange={(e) =>
                    handleChange(L, "companyName", e.target.value)
                  }
                  placeholder={
                    L === "th"
                      ? "เช่น บริษัท เอ บี ซี จำกัด"
                      : "e.g., ABC Co., Ltd."
                  }
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span>{L === "th" ? "ชื่อผู้ติดต่อ" : "Contact Person"}</span>
                  <input
                    value={formData[L].contactName}
                    onChange={(e) =>
                      handleChange(L, "contactName", e.target.value)
                    }
                    placeholder={
                      L === "th" ? "ชื่อ-นามสกุล" : "First & Last Name"
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>{L === "th" ? "ตำแหน่ง" : "Position"}</span>
                  <input
                    value={formData[L].position}
                    onChange={(e) =>
                      handleChange(L, "position", e.target.value)
                    }
                    placeholder={
                      L === "th" ? "เช่น ผู้จัดการ" : "e.g., Manager"
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span>{L === "th" ? "เบอร์โทร" : "Phone"}</span>
                  <input
                    type="tel"
                    value={formData[L].phone}
                    onChange={(e) => handleChange(L, "phone", e.target.value)}
                    placeholder={
                      L === "th" ? "เบอร์สำนักงาน/มือถือ" : "Office/Mobile"
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>LINE ID (optional)</span>
                  <input
                    value={formData[L].lineId}
                    onChange={(e) => handleChange(L, "lineId", e.target.value)}
                    placeholder="Line ID"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "ที่อยู่ (optional)" : "Address (optional)"}
                </span>
                <input
                  value={formData[L].address}
                  onChange={(e) => handleChange(L, "address", e.target.value)}
                  placeholder={L === "th" ? "ที่อยู่บริษัท" : "Company Address"}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>
                  {L === "th" ? "หมายเหตุ (optional)" : "Note (optional)"}
                </span>
                <input
                  value={formData[L].note}
                  onChange={(e) => handleChange(L, "note", e.target.value)}
                  placeholder={
                    L === "th" ? "รายละเอียดเพิ่มเติม" : "Additional details"
                  }
                />
              </label>
            </>
          )}

          <button type="submit" className="btn btn-primary mt-2">
            ✅ บันทึกข้อมูล
          </button>
        </form>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            ❌ ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
