import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

export default function AddCustomerPage({ onClose, onSave }) {
  const [customerType, setCustomerType] = useState("บุคคลทั่วไป");
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    contactName: "",
    position: "",
    phone: "",
    lineId: "",
    address: "",
    note: "",
  });

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name =
      customerType === "บุคคลทั่วไป"
        ? formData.name
        : `${formData.companyName} (${formData.contactName})`;

    if (!name || !formData.phone) {
      return alert("❗ กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const { error } = await supabase.from("customers").insert([
      {
        name,
        tel: formData.phone,
        type: customerType,
        company_name: customerType === "บริษัท" ? formData.companyName : null,
        contact_name: customerType === "บริษัท" ? formData.contactName : null,
        position: customerType === "บริษัท" ? formData.position : null,
        line_id: formData.lineId ,
        address: formData.address || "",
        note: formData.note || "",
      },
    ]);

    if (error) return alert("❌ บันทึกลูกค้าไม่สำเร็จ: " + error.message);
    alert("✅ บันทึกลูกค้าเรียบร้อยแล้ว");
    if (onSave) onSave(name);
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-base-100">
        <h2 className="font-bold text-xl text-primary mb-4">
          ➕ เพิ่มลูกค้าใหม่
        </h2>
        <form onSubmit={handleSubmit} className="add-form">
          {/* ประเภทลูกค้า */}
          <label>
            ประเภทลูกค้า
            <div className="flex gap-4 mt-2">
              <span
                type="button"
                className={`btn btn-sm ${
                  customerType === "บุคคลทั่วไป" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => setCustomerType("บุคคลทั่วไป")}
              >
                บุคคลทั่วไป
              </span>
              <span
                type="button"
                className={`btn btn-sm ${
                  customerType === "บริษัท" ? "btn-primary" : "btn-outline"
                }`}
                onClick={() => setCustomerType("บริษัท")}
              >
                บริษัท
              </span>
            </div>
          </label>

          {/* แบบฟอร์มตามประเภท */}
          {customerType === "บุคคลทั่วไป" ? (
            <>
              <label>
                ชื่อ-นามสกุล
                <input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="ชื่อเต็ม"
                />
              </label>
              <label>
                เบอร์โทร
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="เบอร์มือถือ"
                />
              </label>
               <label>
                LINE ID (optional)
                <input
                  value={formData.lineId}
                  onChange={(e) => handleChange("lineId", e.target.value)}
                  placeholder="Line ID"
                />
              </label>
              <label>
                ที่อยู่ (optional)
                <input
                  value={formData.note}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </label>
              <label>
                หมายเหตุ (optional)
                <input
                  value={formData.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                ชื่อบริษัท
                <input
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="ชื่อบริษัท"
                />
              </label>
              <label>
                ชื่อผู้ติดต่อ
                <input
                  value={formData.contactName}
                  onChange={(e) => handleChange("contactName", e.target.value)}
                  placeholder="ชื่อ-นามสกุลผู้ติดต่อ"
                />
              </label>
              <label>
                ตำแหน่ง
                <input
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  placeholder="ตำแหน่งในบริษัท"
                />
              </label>
              <label>
                เบอร์โทร
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="เบอร์สำนักงาน/มือถือ"
                />
              </label>
              <label>
                LINE ID (optional)
                <input
                  value={formData.lineId}
                  onChange={(e) => handleChange("lineId", e.target.value)}
                  placeholder="Line ID"
                />
              </label>
              <label>
                ที่อยู่ (optional)
                <input
                  value={formData.note}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="address"
                />
              </label>
              <label>
                หมายเหตุ (optional)
                <input
                  value={formData.note}
                  onChange={(e) => handleChange("note", e.target.value)}
                />
              </label>
            </>
          )}

          <button type="submit" className="btn-save">
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
