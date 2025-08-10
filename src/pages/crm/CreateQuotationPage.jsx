import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import AddCustomerModal from "./AddCustomerPage";

export default function CreateQuotationPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // ฟิลด์หลัก
  const [quotationNo, setQuotationNo] = useState(makeQuotationNo());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(7);

  // โครง items “หลัก” ตามที่ใช้อยู่
  const [items, setItems] = useState([
    { name: "", qty: 1, unit: "ชิ้น", unit_price: 2 },
  ]);
  const [note, setNote] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const userName = localStorage.getItem("username");

  useEffect(() => {
    const loadCustomers = async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (!error) setCustomers(data || []);
    };
    loadCustomers();
  }, []);

  useEffect(() => {
    const lower = customerName.toLowerCase();
    const filtered = customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(lower) ||
        (c.company_name || "").toLowerCase().includes(lower) ||
        (c.contact_name || "").toLowerCase().includes(lower)
    );
    setFilteredCustomers(filtered.slice(0, 5));
  }, [customerName, customers]);

  const handleItemChange = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value }; // เก็บดิบๆ
      return next;
    });
  };

  const addItem = () => {
    setItems([...items, { name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // รวมต่อบรรทัด + รวมทั้งบิล (ใช้ “หลัก” นี้)
  const toNum = (v) => (v === "" || v == null ? 0 : parseFloat(v)) || 0;

  const lineTotal = (it) => toNum(it.qty) * toNum(it.unit_price);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discountAmount = subtotal * ((parseFloat(discountPercent) || 0) / 100);
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const vatAmount = afterDiscount * ((parseFloat(vatPercent) || 0) / 100);
  const totalPrice = afterDiscount + vatAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("❗ กรุณาเลือกลูกค้าจากรายการที่แนะนำ");
    if (!items.length) return alert("❗ กรุณาใส่รายการอย่างน้อย 1 รายการ");

    // helper ในฟังก์ชัน (ไม่ต้องไปประกาศข้างนอก)
    const toNum = (v) =>
      (v === "" || v == null ? 0 : parseFloat(String(v))) || 0;
    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    // ทำ items ให้เป็นตัวเลข + ใส่ total ต่อแถว
    const normItems = items.map((it) => {
      const qty = toNum(it.qty);
      const unit_price = toNum(it.unit_price);
      return {
        name: (it.name || "").trim(),
        unit: (it.unit || "ชิ้น").trim(),
        qty,
        unit_price,
        total: round2(qty * unit_price),
      };
    });

    // คำนวณรวมสำหรับบันทึก
    const subtotal = round2(normItems.reduce((s, x) => s + x.total, 0));
    const discountPct = toNum(discountPercent);
    const vatPct = toNum(vatPercent);
    const discount_amount = round2(subtotal * (discountPct / 100));
    const after_discount = round2(subtotal - discount_amount);
    const vat_amount = round2(after_discount * (vatPct / 100));
    const total = round2(after_discount + vat_amount);

    if (subtotal <= 0) return alert("❗ มูลค่ารวมต้องมากกว่า 0");

    const payload = {
      number: quotationNo,
      customer_id: customerId,
      items: normItems,
      note,
      subtotal,
      discount_percent: discountPct, // ✅ แก้ parseFloat(discountPercent)
      discount_amount,
      after_discount,
      vat_percent: vatPct,
      vat_amount,
      total,
      created_at: new Date().toISOString(),
      created_by: userName,
      status: "draft",
    };

    const { error } = await supabase.from("quotations").insert([payload]);
    if (error) return alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    alert("✅ บันทึกใบเสนอราคาแล้ว!");

    // reset ฟอร์ม
    setItems([{ name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
    setNote("");
    setDiscountPercent(0);
    setVatPercent(7);
    setQuotationNo(makeQuotationNo());
    setCustomerName("");
    setCustomerId(null);
  };

  return (
    <div className="add-root">
      <h2 className="add-header">📄 บันทึกใบเสนอราคา</h2>
      <form className="add-form" onSubmit={handleSubmit}>
        {/* เลขที่ใบเสนอราคา */}
        <label>
          เลขที่ใบเสนอราคา
          <input
            type="text"
            value={quotationNo}
            onChange={(e) => setQuotationNo(e.target.value)}
            placeholder="เช่น QU-2025-0001"
          />
        </label>

        {/* ลูกค้า */}
        <label>
          ชื่อลูกค้า
          <div style={{ display: "flex", gap: "8px", position: "relative" }}>
            <input
              type="text"
              placeholder="ใส่ชื่อลูกค้า"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ flex: 1, padding: "0.4rem 0.6rem" }}
            />
            {customerName && filteredCustomers.length > 0 && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #ddd",
                  zIndex: 10,
                  maxHeight: "150px",
                  overflowY: "auto",
                  listStyle: "none",
                  padding: "0.5rem",
                  margin: 0,
                }}
              >
                {filteredCustomers.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => {
                      setCustomerName(c.name);
                      setCustomerId(c.id);
                      setFilteredCustomers([]);
                    }}
                    style={{
                      padding: "4px 8px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <strong>{c.name}</strong>
                    {c.company_name && (
                      <>
                        <br />
                        <span style={{ fontSize: "0.8em", color: "#888" }}>
                          {c.company_name} (
                          {c.contact_name || "ไม่ระบุผู้ติดต่อ"})
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <span
              className="btn-save"
              onClick={() => setShowCustomerModal(true)}
              style={{ padding: "0.6rem 1rem" }}
            >
              ➕
            </span>
          </div>
        </label>

        {/* รายการ */}
        <label>
          รายการสินค้า / บริการ
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 0.8fr 1fr 1fr 1fr 40px",
              gap: 8,
              marginTop: 6,
              fontWeight: 600,
            }}
          >
            <div>ชื่อรายการ</div>
            <div style={{ textAlign: "right" }}>จำนวน</div>
            <div>หน่วย</div>
            <div style={{ textAlign: "right" }}>ราคาต่อหน่วย</div>
            <div style={{ textAlign: "right" }}>ราคารวม</div>
            <div></div>
          </div>
          {items.map((it, idx) => (
            <div
              className="items-grid"
              key={idx}
              style={{ alignItems: "center" }}
            >
              <input
                type="text"
                value={it.name}
                onChange={(e) => handleItemChange(idx, "name", e.target.value)}
              />
              {/* จำนวน */}
              <input
                type="text" // จะพิมพ์ได้ลื่นกว่า number
                inputMode="numeric"
                value={it.qty}
                onChange={(e) =>
                  handleItemChange(
                    idx,
                    "qty",
                    e.target.value.replace(/[^\d.]/g, "")
                  )
                }
                style={{ textAlign: "right" }}
              />

              {/* หน่วย */}
              <input
                type="text"
                value={it.unit}
                onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
              />

              {/* ราคาต่อหน่วย */}
              <input
                type="text"
                inputMode="decimal"
                value={it.unit_price}
                onChange={(e) =>
                  handleItemChange(
                    idx,
                    "unit_price",
                    e.target.value.replace(/[^\d.]/g, "")
                  )
                }
                style={{ textAlign: "right" }}
              />

              <input
                value={lineTotal(it).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
                readOnly
                style={{ textAlign: "right", background: "#f7f7f7" }}
              />
              <button className="btn-delete" type="button" onClick={() => removeItem(idx)}>
                ✖
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="btn-save"
            style={{ marginTop: 8, width: "fit-content" }}
          >
            ➕ เพิ่มรายการ
          </button>
        </label>

        {/* ส่วนลด & VAT */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <label>
            ส่วนลด (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="เช่น 2"
            />
          </label>
          <label>
            VAT (%)
            <input
              type="number"
              min="0"
              step="0.01"
              value={vatPercent}
              onChange={(e) => setVatPercent(e.target.value)}
              placeholder="เช่น 7"
            />
          </label>
        </div>

        {/* หมายเหตุ */}
        <label>
          หมายเหตุ
          <textarea
            placeholder="เพิ่มเติม เช่น เงื่อนไข"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </label>

        {/* แสดงผลรวม */}
        <div
          style={{
            marginTop: 12,
            background: "#f8f8f8",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <div>
            รวมเป็นเงิน:{" "}
            {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
            บาท
          </div>
          <div>
            ส่วนลด ({discountPercent || 0}%): -
            {discountAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            บาท
          </div>
          <div>
            ยอดหลังหักส่วนลด:{" "}
            {afterDiscount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}{" "}
            บาท
          </div>
          <div>
            ภาษีมูลค่าเพิ่ม ({vatPercent || 0}%):{" "}
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
            บาท
          </div>
          <div style={{ fontWeight: "bold", fontSize: 18, textAlign: "right" }}>
            💰 ยอดสุทธิ:{" "}
            {totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
            บาท
          </div>
        </div>

        <button type="submit" className="btn-save" style={{ marginTop: 12 }}>
          ✅ บันทึกข้อมูล
        </button>
      </form>

      {showCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSave={(newName) => {
            setCustomerName(newName);
            setShowCustomerModal(false);
          }}
        />
      )}
    </div>
  );
}

/** สร้างเลขที่ใบเสนอราคาอย่างง่าย: QU-YYYYMMDD-HHmmss */
function makeQuotationNo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `QU-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
