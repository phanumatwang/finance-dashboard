import { useState, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./TimeTrackingPage.css";
import { resizeImageFile } from "../../utils/imageUtils";
import { useLoading } from "../../components/LoadingContext";
export default function TimeTrackingPage() {
   const { setIsLoading } = useLoading();
  const userName = localStorage.getItem("username");
  const role = localStorage.getItem("role"); // ✅ ดูสิทธิ์ user/admin/superadmin
  const wage_amount = localStorage.getItem("wage");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [logs, setLogs] = useState([]);
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_FILE_SIZE_MB = 2;
  const MAX_WIDTH = 1024; // ปรับตามต้องการ
  useEffect(() => {
    fetchLogs();
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      {
        threshold: 0.1, // 10% visible ถึงจะแสดง
      }
    );

    const cards = document.querySelectorAll(".time-card");
    cards.forEach((card) => observer.observe(card));

    // Cleanup
    return () => {
      cards.forEach((card) => observer.unobserve(card));
    };
  }, [logs]);

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

  async function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      const resized = await resizeImageFile(selectedFile, 2, 1024); // 2MB, 1024px
      setFile(resized);
      setFileName(resized.name);
    } catch (err) {
      alert("❌ " + err.message);
      setFile(null);
      setFileName("");
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    
    if (alreadyLoggedToday) {
      alert("⚠️ วันนี้คุณบันทึกแล้ว ไม่สามารถบันทึกซ้ำได้");
      return;
    }
    
    setIsSubmitting(true);

    let imageUrl = null;
    if (file) {
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(`time-tracking/${Date.now()}-${file.name}`, file);

      if (error) {
        alert("❌ อัปโหลดไฟล์ไม่สำเร็จ: " + error.message);
        setIsSubmitting(false);
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
        status: "pending",
        wage_amount,
      },
    ]);

    setIsSubmitting(false);

    if (insertError) {
      alert("❌ บันทึกไม่สำเร็จ: " + insertError.message);
    } else {
      alert("✅ บันทึกสำเร็จ!");
      fetchLogs();
      setDescription("");
      setFile(null);
      setFileName("");
    }
    
    await new Promise((r) => setTimeout(r, 2000)); // simulate
    setIsLoading(false);
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
            disabled={alreadyLoggedToday || isSubmitting}
          >
            {alreadyLoggedToday
              ? "✅ วันนี้บันทึกแล้ว"
              : isSubmitting
              ? "⏳ กำลังบันทึก..."
              : "✅ บันทึกงาน"}
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
            {/* <p> {log.status ? "✅ อนุมัติแล้ว" : "⏳ รออนุมัติ"}</p> */}

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
