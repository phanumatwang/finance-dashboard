import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./OTApprovePage.css";

export default function OTApprovePage() {
  const [requests, setRequests] = useState([]);
  const role = localStorage.getItem("role");

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    const { data, error } = await supabase
      .from("overtime_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setRequests(data);
  }

  async function approveRequest(id) {
    const { error } = await supabase
      .from("overtime_requests")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) alert("❌ อนุมัติไม่สำเร็จ");
    else {
      alert("✅ อนุมัติสำเร็จ!");
      fetchRequests();
    }
  }

  return (
    <div className="ot-approve-root">
      <h2>✅ อนุมัติ OT</h2>

      {requests.length === 0 ? (
        <p>ยังไม่มีคำขอ OT</p>
      ) : (
        <div className="ot-card-list">
          {requests.map((req) => (
            <div key={req.id} className="ot-card">
              <div className="ot-card-row">
                <b>ผู้ขอ: {req.requested_by}</b> |{" "}
                📅 {new Date(req.created_at).toLocaleDateString("th-TH")} | ⏳{" "}
                {req.hours} ชั่วโมง | 📝 {req.reason} | 💰 {req.amount || 125} บาท
              </div>
              <div className="ot-card-row">
                ✅ สถานะ:{" "}
                {req.status === "approved" ? "✔️ อนุมัติแล้ว" : "⏳ รออนุมัติ"}
              </div>

              {req.status === "pending" &&
                (role === "admin" || role === "superadmin") && (
                  <button
                    className="btn-approve"
                    onClick={() => approveRequest(req.id)}
                  >
                    ✅ อนุมัติ
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
