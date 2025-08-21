import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useLocation } from "react-router-dom";
import { useLoading } from "../../components/LoadingContext";
import { nextRevisionNumber } from "../../utils/quotationNumber";
import { hasContentChanged } from "../../utils/quotationDiff";
import { useNavigate } from "react-router-dom";


export default function CreateQuotationPage({
  quotationData: quotationFromProps,
  onClose,
}) {
  const { state } = useLocation();
  // ถ้ามี state มาก็ใช้, ถ้าไม่มีให้ใช้จาก props
  const original = state?.quotationData ?? quotationFromProps ?? null;
  

  const { setIsLoading } = useLoading();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isCustomerFocus, setIsCustomerFocus] = useState(false);
  const [quotationNo, setQuotationNo] = useState(makeQuotationNo());
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(7);

  const [items, setItems] = useState([
    { name: "", qty: 1, unit: "ชิ้น", unit_price: 0 },
  ]);
  const [note, setNote] = useState("");
  const userName = localStorage.getItem("username");

  // โหลดรายชื่อลูกค้า
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (!error) setCustomers(data || []);
    })();
  }, []);

  // พรีฟิลจากใบเสนอราคา (เมื่อ customers พร้อม และ original เปลี่ยน)
  useEffect(() => {
    if (!customers.length) return;
    prefillFromQuotation(original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, original?.id]); // ใช้ id เพื่อจับการเปลี่ยนใบ

  // ฟิลเตอร์ตัวเลือกชื่อลูกค้า
  useEffect(() => {
    const norm = (v) => (v ?? "").toString().trim().toLowerCase();
    const q = norm(customerName);
    if (!q) {
      setFilteredCustomers(customers.slice(0, 5));
      return;
    }
    const fields = [
      "name",
      "company_name",
      "contact_name",
      "name_en",
      "company_name_en",
    ];
    const filtered = customers.filter((c) =>
      fields.some((f) => norm(c[f]).includes(q))
    );
    setFilteredCustomers(filtered.slice(0, 5));
  }, [customerName, customers]);

  const prefillFromQuotation = (q) => {
    if (!q) {
      // โหมดสร้างใหม่
      setQuotationNo(makeQuotationNo());
      setNote("");
      setDiscountPercent(0);
      setVatPercent(7);
      setItems([{ name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
      setCustomerId(null);
      // ไม่ reset customerName — เผื่อผู้ใช้พิมพ์เตรียมไว้
      return;
    }
    // โหมดแก้ไข
    setQuotationNo(q.number || makeQuotationNo());
    setNote(q.note || "");

    if (Array.isArray(q.items) && q.items.length) {
      setItems(
        q.items.map((it) => ({
          name: it.name || "",
          qty: Number(it.qty) || 1,
          unit: it.unit || "ชิ้น",
          unit_price: Number(it.unit_price ?? it.price ?? 0),
        }))
      );
    } else {
      setItems([{ name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
    }

    if (q.discount_percent != null) setDiscountPercent(q.discount_percent);
    if (q.vat_percent != null) setVatPercent(q.vat_percent);

    if (q.customers?.name) {
      setCustomerName(q.customers.name);
      const f1 = customers.find(
        (c) => (c.name || "").trim() === (q.customers.name || "").trim()
      );
      if (f1) setCustomerId(f1.id);
    } else if (q.customer_id) {
      setCustomerId(q.customer_id);
      const f2 = customers.find((c) => c.id === q.customer_id);
      if (f2) setCustomerName(f2.name);
    }
  };

  const handleItemChange = (index, key, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };
  const addItem = () =>
    setItems([...items, { name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  // คำนวณ
  const toNum = (v) => (v === "" || v == null ? 0 : parseFloat(v)) || 0;
  const lineTotal = (it) => toNum(it.qty) * toNum(it.unit_price);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const discountAmount = subtotal * ((parseFloat(discountPercent) || 0) / 100);
  const afterDiscount = Math.max(subtotal - discountAmount, 0);
  const vatAmount = afterDiscount * ((parseFloat(vatPercent) || 0) / 100);
  const totalPrice = afterDiscount + vatAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const toNumLocal = (v) =>
        (v === "" || v == null ? 0 : parseFloat(String(v))) || 0;
      const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

      const normItems = items.map((it) => {
        const qty = toNumLocal(it.qty);
        const unit_price = toNumLocal(it.unit_price);
        return {
          name: (it.name || "").trim(),
          unit: (it.unit || "ชิ้น").trim(),
          qty,
          unit_price,
          total: round2(qty * unit_price),
        };
      });

      const subtotal2 = round2(normItems.reduce((s, x) => s + x.total, 0));
      const discountPct = toNumLocal(discountPercent);
      const vatPct = toNumLocal(vatPercent);
      const discount_amount = round2(subtotal2 * (discountPct / 100));
      const after_discount = round2(subtotal2 - discount_amount);
      const vat_amount = round2(after_discount * (vatPct / 100));
      const total = round2(after_discount + vat_amount);

      if (subtotal2 <= 0) {
        alert("❗ มูลค่ารวมต้องมากกว่า 0");
        return;
      }

      // หา/สร้างลูกค้า
      let finalCustomerId = customerId;
      if (!finalCustomerId && customerName.trim()) {
        const existed = customers.find(
          (c) => (c.name || "").trim() === customerName.trim()
        );
        if (existed) {
          finalCustomerId = existed.id;
        } else {
          const { data: created, error: cErr } = await supabase
            .from("customers")
            .insert([{ name: customerName.trim() }])
            .select()
            .single();
          if (cErr) throw new Error(`สร้างลูกค้าไม่สำเร็จ: ${cErr.message}`);
          finalCustomerId = created.id;
        }
      }
      if (!finalCustomerId) {
        alert("❗ กรุณาใส่ชื่อลูกค้าหรือเลือกจากรายการ");
        return;
      }

      // payload ปัจจุบัน
      const payload = {
        number: quotationNo, // อาจถูกแก้เป็น -R ด้านล่าง
        customer_id: finalCustomerId,
        items: normItems,
        note,
        subtotal: subtotal2,
        discount_percent: discountPct,
        discount_amount,
        after_discount,
        vat_percent: vatPct,
        vat_amount,
        total,
        created_at: new Date().toISOString(),
        created_by: userName,
        status: original?.status || "draft",
        // updated_at: new Date().toISOString(), // ถ้า DB มีคอลัมน์นี้และอยากให้ client เซ็ตเอง
      };

      if (original?.id) {
        // โหมดแก้ไข → ตรวจเฉพาะ items/discount/vat เพื่อเด้ง R
        const changed = hasContentChanged(
          {
            items: original.items,
            discount_percent: original.discount_percent,
            vat_percent: original.vat_percent,
          },
          {
            items: payload.items,
            discount_percent: payload.discount_percent,
            vat_percent: payload.vat_percent,
          }
        );

        payload.number = changed
          ? nextRevisionNumber(original.number || quotationNo)
          : original.number || quotationNo;

        const { error } = await supabase
          .from("quotations")
          .update(payload)
          .eq("id", original.id);
        if (error) throw new Error(error.message);
      } else {
        // โหมดสร้างใหม่
        const { error } = await supabase.from("quotations").insert([payload]);
        if (error) throw new Error(error.message);
      }

      alert("✅ บันทึกใบเสนอราคาแล้ว!");
      // ปิดโมดัลถ้าถูกฝังใน dialog
      if (onClose) onClose();

      // ถ้าอยาก reset ฟอร์มเมื่อสร้างใหม่:
      if (!original?.id) {
        setItems([{ name: "", qty: 1, unit: "ชิ้น", unit_price: 0 }]);
        setNote("");
        setDiscountPercent(0);
        setVatPercent(7);
        setQuotationNo(makeQuotationNo());
        setCustomerId(null);
        // setCustomerName(""); // ถ้าต้องการรีเซ็ตชื่อด้วย
      }
    } catch (err) {
      alert("❌ บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      navigate("/quot/list");
      setIsLoading(false);
    }
  };

  return (
    <div className="form-scroll">
      <div className="add-root">
        <h2 className="add-header">
          📄 {original?.id ? "แก้ไขใบเสนอราคา" : "บันทึกใบเสนอราคา"}
        </h2>

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
                onFocus={() => setIsCustomerFocus(true)}
                onBlur={() => setTimeout(() => setIsCustomerFocus(false), 120)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCustomerFocus(false);
                  }
                }}
              />
              
              {isCustomerFocus &&
                customerName &&
                filteredCustomers.length > 0 && (
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
                        onMouseDown={() => {
                          setCustomerName(c.name);
                          setCustomerId(c.id);
                          setFilteredCustomers([]);
                          setIsCustomerFocus(false);
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
              <div />
            </div>
            {items.map((it, idx) => {
              const line = lineTotal(it);
              return (
                <div
                  className="items-grid"
                  key={idx}
                  style={{ alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) =>
                      handleItemChange(idx, "name", e.target.value)
                    }
                  />
                  <input
                    type="text"
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
                  <input
                    type="text"
                    value={it.unit}
                    onChange={(e) =>
                      handleItemChange(idx, "unit", e.target.value)
                    }
                  />
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
                    value={line.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                    readOnly
                    style={{ textAlign: "right", background: "#f7f7f7" }}
                  />
                  <button
                    className="btn-delete"
                    type="button"
                    onClick={() => removeItem(idx)}
                  >
                    ✖
                  </button>
                </div>
              );
            })}
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
            className="discount-vat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 12,
              marginTop: 6,
              fontWeight: 600,
              width: "100%",
              alignItems: "center",
            }}
          >
            <label
              style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              ส่วนลด (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="เช่น 2"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>

            <label
              style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              VAT (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={vatPercent}
                onChange={(e) => setVatPercent(e.target.value)}
                placeholder="เช่น 7"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
          </div>

          {/* สรุป */}
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
              ภาษีมูลค่าเพิ่ม ({vatPercent || 0}%):
              {vatAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              บาท
            </div>
            <div
              style={{ fontWeight: "bold", fontSize: 18, textAlign: "right" }}
            >
              💰 ยอดสุทธิ:{" "}
              {totalPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}{" "}
              บาท
            </div>
          </div>

          <label style={{ marginTop: 12 }}>
            หมายเหตุ
            <textarea
              placeholder="เพิ่มเติม เช่น เงื่อนไข"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>

          <button type="submit" className="btn-save" style={{ marginTop: 12 }}>
            ✅ บันทึกข้อมูล
          </button>
        </form>
      </div>
      
    </div>
  );
}

function makeQuotationNo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `QU-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(
    d.getDate()
  )}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
