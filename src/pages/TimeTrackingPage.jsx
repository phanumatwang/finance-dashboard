import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./TimeTrackingPage.css";

export default function TimeTrackingPage() {
  const userName = localStorage.getItem("username");
  const role = localStorage.getItem("role"); // ✅ ดูสิทธิ์ user/admin/superadmin
  const wage_amount = localStorage.getItem("wage");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [logs, setLogs] = useState([]);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("time_tracking")
      .select("*")
      .order("created_at", { ascending: false });

    // ✅ user เห็นเฉพาะของตัวเอง
    if (role === "user") {
      query = query.eq("created_by", userName);
    }

    const { data, error } = await query;
    if (error) console.error(error.message);
    else {
      setLogs(data);

      // ✅ เช็คว่ามีการบันทึกวันนี้แล้วหรือไม่
      const hasToday = data.some(
        (log) => log.date === today && log.created_by === userName
      );
      setAlreadyLoggedToday(hasToday);
    }
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    } else {
      setFile(null);
      setFileName("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (alreadyLoggedToday) {
      alert("⚠️ วันนี้คุณบันทึกแล้ว ไม่สามารถบันทึกซ้ำได้");
      return;
    }

    let imageUrl = null;

    if (file) {
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(`time-tracking/${Date.now()}-${file.name}`, file);

      if (error) {
        alert("❌ อัปโหลดไฟล์ไม่สำเร็จ: " + error.message);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);
      imageUrl = publicUrl.publicUrl;
    }

    const today = new Date().toISOString().split("T")[0];

    const { error: insertError } = await supabase.from("time_tracking").insert([
      {
        date: today,
        description,
        created_by: userName,
        file_url: imageUrl,
        status: "pending", // ✅ บันทึกสถานะเริ่มต้น
        wage_amount: wage_amount, // ✅ บันทึกค่าแรง
      },
    ]);

    if (insertError) {
      alert("❌ บันทึกไม่สำเร็จ: " + insertError.message);
    } else {
      alert("✅ บันทึกสำเร็จ!");
      fetchLogs();
      setDescription("");
      setFile(null);
      setFileName("");
    }
  }

  // ✅ ฟังก์ชันอนุมัติ / ไม่อนุมัติ
  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from("time_tracking")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      alert("❌ อัปเดตสถานะไม่สำเร็จ");
    } else {
      alert(
        `✅ อัปเดตเป็น ${
          newStatus === "approved" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ"
        }!`
      );
      fetchLogs();
    }
  }

  return (
    <div className="time-root">
      <h2>⏱️ บันทึกงานวันนี้</h2>
      {role === "user" ? (
        <form className="time-form" onSubmit={handleSubmit}>
          <label>
            รายละเอียดงาน
            <textarea
              placeholder="เขียนรายละเอียดงานที่ทำ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={alreadyLoggedToday}
            />
          </label>

          <label>
            แนบรูปถ่าย
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={alreadyLoggedToday}
            />
          </label>
          {fileName && <p className="file-preview">📎 เลือกไฟล์: {fileName}</p>}

          <button
            type="submit"
            className="btn-save"
            disabled={alreadyLoggedToday}
          >
            {alreadyLoggedToday ? "✅ วันนี้บันทึกแล้ว" : "✅ บันทึกงาน"}
          </button>
        </form>
      ) : (
        <p></p>
      )}
      <h3>📜 ประวัติการบันทึก</h3>
      <ul className="time-log-list">
        {logs.map((log) => (
          <li key={log.id} className="time-card">
            <p>
              📅 <b>{log.date}</b>
            </p>
            <p>📝 {log.description}</p>
            <p>✍️ {log.created_by}</p>
            <p> {log.status ? "✅ อนุมัติแล้ว" : "⏳ รออนุมัติ"}</p>

            {log.file_url && (
              <div style={{ marginTop: "0.5rem" }}>
                <img
                  src={log.file_url}
                  alt="แนบรูป"
                  style={{
                    width: "100%",
                    maxWidth: "200px",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            )}

            {/* ✅ ปุ่มอนุมัติ/ไม่อนุมัติ เห็นเฉพาะ admin + superadmin */}
            {(role === "admin" || role === "superadmin") &&
              log.status === "pending" && (
                <div className="card-actions">
                  <button
                    className="btn-approve"
                    onClick={() => updateStatus(log.id, "approved")}
                  >
                    อนุมัติ
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => updateStatus(log.id, "rejected")}
                  >
                    ไม่อนุมัติ
                  </button>
                </div>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}
