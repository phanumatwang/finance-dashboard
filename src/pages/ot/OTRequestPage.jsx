import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./OTRequestPage.css";

export default function OTRequestPage() {
  const userName = localStorage.getItem("username");
  const userWage = parseFloat(localStorage.getItem("wage") || 0); // ✅ ค่าแรง/วัน
  const hourlyRate = userWage / 8; // ✅ สมมติทำงานปกติ 8 ชม./วัน → OT คิดตามชั่วโมง

  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [otHistory, setOtHistory] = useState([]);

  useEffect(() => {
    fetchOtHistory();
  }, []);
  
  async function fetchOtHistory() {
    const { data, error } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("requested_by", userName)
      .order("created_at", { ascending: false });

    if (!error && data) setOtHistory(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!hours || !reason) {
      alert("⚠️ กรุณากรอกจำนวนชั่วโมงและเหตุผล");
      return;
    }

    const otHours = parseFloat(hours);
    const otAmount = otHours * hourlyRate; // ✅ คำนวณเงิน OT

    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("overtime_requests").insert([
      {
        requested_by: userName,
        hours: otHours,
        reason,
        status: "pending",
        date: today,
        ot_amount: otAmount,  // ✅ บันทึกเงิน OT รวม
      },
    ]);

    if (error) alert("❌ บันทึกไม่สำเร็จ: " + error.message);
    else {
      alert(`✅ ส่งคำขอ OT สำเร็จ! (${otHours} ชั่วโมง = ${otAmount.toLocaleString()} บาท)`);
      setHours("");
      setReason("");
      fetchOtHistory();
    }
  }

  return (
    <div className="ot-root">
      <h2>⏱️ ขอทำ OT</h2>

      <p>💰 ค่าแรงต่อวัน: {userWage.toLocaleString()} บาท | OT ต่อชั่วโมง: {hourlyRate.toLocaleString()} บาท</p>

      <form className="ot-form" onSubmit={handleSubmit}>
        <label>จำนวนชั่วโมง OT</label>
        <input
          type="number"
          placeholder="เช่น 2 ชั่วโมง"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />

        <label>เหตุผลการขอ OT</label>
        <textarea
          placeholder="เขียนเหตุผลที่ต้องทำ OT..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button type="submit">✅ ส่งคำขอ OT</button>
      </form>

      <div className="ot-history">
        <h3>📜 ประวัติคำขอ OT</h3>
        <ul className="ot-list">
          {otHistory.length === 0 ? (
            <p>ยังไม่มีคำขอ OT</p>
          ) : (
            otHistory.map((ot) => (
              <li key={ot.id}>
                📅 {new Date(ot.date).toLocaleDateString("th-TH")}  
                | ⏳ {ot.hours} ชั่วโมง  
                | 📝 {ot.reason}  
                | 💵 {ot.ot_amount ? ot.ot_amount.toLocaleString() : "-"} บาท  
                | ✅ สถานะ:{" "}
                {ot.status === "approved" ? "✔️ อนุมัติแล้ว" : "⏳ รออนุมัติ"}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
