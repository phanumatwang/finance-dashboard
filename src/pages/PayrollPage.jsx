import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PayrollPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [logs, setLogs] = useState([]);
  const [totalWage, setTotalWage] = useState(0);
  const [paymentProof, setPaymentProof] = useState(null);

  const [proofFileName, setProofFileName] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    // ✅ ดึง user list จาก time_tracking
    const { data, error } = await supabase
      .from("time_tracking")
      .select("created_by")
      .neq("status", "paid"); // เอาเฉพาะที่ยังไม่จ่าย

    if (error) {
      console.error(error.message);
      return;
    }

    // ✅ unique users
    const uniqueUsers = [...new Set(data.map((u) => u.created_by))];
    setUsers(uniqueUsers);
  }

  async function fetchUserLogs(user) {
    setSelectedUser(user);

    const { data, error } = await supabase
      .from("time_tracking")
      .select("*")
      .eq("created_by", user)
      .eq("status", "approved")
      .order("date", { ascending: true });

    // ดึงข้อมูล OT
    const { data: otData, error: otError } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("requested_by", user)
      .eq("status", "approved")
      .order("date", { ascending: true });

    if (error || otError) {
      console.error(error?.message || otError?.message);
      return;
    }

    // รวม log ทั้งสองตาราง
    const allLogs = [
      ...(data || []),
      ...(otData || []).map((ot) => ({
        ...ot,
        description: ot.description || "OT",
        wage_amount: ot.ot_amount || 0, // สมมติ ot_amount คือยอด OT
      })),
    ];
    console.log("Combined logs:", allLogs);
    setLogs(allLogs);

    // รวมยอดค่าแรง + OT
    const sum = allLogs.reduce((acc, item) => acc + (item.wage_amount || 0), 0);
    setTotalWage(sum);
  }

  function handleProofFile(e) {
    if (e.target.files.length > 0) {
      setPaymentProof(e.target.files[0]);
      setProofFileName(e.target.files[0].name);
    } else {
      setPaymentProof(null);
      setProofFileName("");
    }
  }

  async function handlePaySalary() {
    if (!selectedUser) {
      alert("⚠️ เลือกผู้ใช้ก่อน");
      return;
    }
    if (logs.length === 0) {
      alert("⚠️ ไม่มีรายการที่อนุมัติแล้ว");
      return;
    }
    if (!paymentProof) {
      alert("⚠️ กรุณาแนบหลักฐานการจ่ายเงินก่อน");
      return;
    }

    // ✅ Upload หลักฐานการจ่าย
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(`payroll/${Date.now()}-${paymentProof.name}`, paymentProof);

    if (uploadError) {
      alert("❌ อัปโหลดหลักฐานไม่สำเร็จ: " + uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(uploadData.path);

    const paymentProofUrl = publicUrl.publicUrl;

    // ✅ สร้าง transaction ใน transactions table
    const today = new Date().toISOString().split("T")[0];
    const insertTransaction = await supabase.from("transactions").insert([
      {
        date: today,
        category: "รายจ่าย",
        description: `ค่าแรง ${selectedUser}`,
        amount: totalWage,
        status: "approved",
        file_url: paymentProofUrl,
      },
    ]);

    if (insertTransaction.error) {
      alert(
        "❌ บันทึก Transaction ไม่สำเร็จ: " + insertTransaction.error.message
      );
      return;
    }

    // ✅ เปลี่ยน status ใน time_tracking จาก approved → paid
    const updateStatus = await supabase
      .from("time_tracking")
      .update({ status: "paid" })
      .eq("created_by", selectedUser)
      .eq("status", "approved");

    if (updateStatus.error) {
      alert("⚠️ เปลี่ยนสถานะไม่สำเร็จ แต่ Transaction ถูกบันทึกแล้ว");
    } else {
      alert(
        `✅ จ่ายค่าแรง ${selectedUser} สำเร็จ (${totalWage.toLocaleString()} บาท)`
      );
      fetchUserLogs(selectedUser); // โหลดใหม่
      fetchUsers(); // อัปเดต list user
      setPaymentProof(null);
      setProofFileName("");
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>💵 ระบบจ่ายเงิน</h2>

      {/* ✅ เลือก user */}
      <label>
        เลือกพนักงาน:
        <select
          value={selectedUser}
          onChange={(e) => fetchUserLogs(e.target.value)}
        >
          <option value="">-- เลือก --</option>
          {users.map((u, idx) => (
            <option key={idx} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      {/* ✅ ถ้ามี log → แสดงรายการ */}
      {selectedUser && (
        <>
          <h3>📜 รายการที่อนุมัติแล้ว</h3>
          {logs.length === 0 ? (
            <p>ไม่มีรายการที่อนุมัติแล้ว</p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr style={{ background: "#eee" }}>
                  <th style={{ padding: "8px", border: "1px solid #ccc" }}>
                    📅 วันที่
                  </th>
                  <th style={{ padding: "8px", border: "1px solid #ccc" }}>
                    📝 รายละเอียด
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      textAlign: "right",
                    }}
                  >
                    💰 ค่าแรง
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                      {log.date}
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                      {log.description}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        textAlign: "right",
                        color: "green",
                        fontWeight: "bold",
                      }}
                    >
                      {log.wage_amount?.toLocaleString()} บาท
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ✅ รวมยอด */}
          <h3 style={{ marginTop: "1rem" }}>
            💰 รวมค่าแรงทั้งหมด:{" "}
            <span style={{ color: "green" }}>
              {totalWage.toLocaleString()} บาท
            </span>
          </h3>

          {/* ✅ แนบหลักฐานก่อนจ่าย */}
          <label>
            แนบหลักฐานการจ่ายเงิน:
            <input type="file" accept="image/*" onChange={handleProofFile} />
          </label>
          {proofFileName && <p>📎 {proofFileName}</p>}

          {/* ✅ ปุ่มจ่ายเงิน */}
          <button
            style={{
              marginTop: "1rem",
              background: "green",
              color: "white",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
            disabled={!paymentProof || logs.length === 0}
            onClick={handlePaySalary}
          >
            ✅ จ่ายเงิน
          </button>
        </>
      )}
    </div>
  );
}
