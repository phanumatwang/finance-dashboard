import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useLoading } from "../../components/LoadingContext";
export default function PayrollPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [logs, setLogs] = useState([]);
  const [totalWage, setTotalWage] = useState(0);
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofFileName, setProofFileName] = useState("");
  const { setIsLoading } = useLoading();
  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("time_tracking")
      .select("created_by")
      .neq("status", "paid");

    if (error) return console.error(error.message);
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

    const { data: otData, error: otError } = await supabase
      .from("overtime_requests")
      .select("*")
      .eq("requested_by", user)
      .eq("status", "approved")
      .order("date", { ascending: true });

    if (error || otError)
      return console.error(error?.message || otError?.message);

    const allLogs = [
      ...(data || []),
      ...(otData || []).map((ot) => ({
        ...ot,
        description: ot.description || "OT",
        wage_amount: ot.ot_amount || 0,
      })),
    ];
    setLogs(allLogs);
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
    if (!selectedUser) return alert("⚠️ เลือกผู้ใช้ก่อน");
    if (logs.length === 0) return alert("⚠️ ไม่มีรายการที่อนุมัติแล้ว");
    if (!paymentProof) return alert("⚠️ กรุณาแนบหลักฐานการจ่ายเงินก่อน");

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(`payroll/${Date.now()}-${paymentProof.name}`, paymentProof);

    if (uploadError)
      return alert("❌ อัปโหลดหลักฐานไม่สำเร็จ: " + uploadError.message);

    const { data: publicUrl } = supabase.storage
      .from("uploads")
      .getPublicUrl(uploadData.path);

    const paymentProofUrl = publicUrl.publicUrl;
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

    if (insertTransaction.error)
      return alert(
        "❌ บันทึก Transaction ไม่สำเร็จ: " + insertTransaction.error.message
      );

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
      fetchUserLogs(selectedUser);
      fetchUsers();
      setPaymentProof(null);
      setProofFileName("");
    }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000)); // simulate
    setIsLoading(false);
  }

  return (
    <div className="form-scroll">
      <div className="payrool-root">
        <div className="max-w-2xl mx-auto p-4">
          <div className="card bg-base-100 shadow-xl p-6 space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
              💵 ระบบจ่ายเงิน
            </h2>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">👤 เลือกพนักงาน</span>
              </div>
              <select
                className="select select-bordered w-full"
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

            {selectedUser && (
              <>
                <h3 className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded">
                  📜 รายการที่อนุมัติแล้ว
                </h3>

                {logs.length === 0 ? (
                  <p className="text-gray-500">ไม่มีรายการที่อนุมัติแล้ว</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full mt-4">
                      <thead>
                        <tr>
                          <th>📅 วันที่</th>
                          <th>📝 รายละเอียด</th>
                          <th className="text-right">💰 ค่าแรง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr
                            className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded"
                            key={log.id}
                          >
                            <td>{log.date}</td>
                            <td>{log.description}</td>
                            <td className="text-right text-green-600 font-semibold">
                              {log.wage_amount?.toLocaleString()} บาท
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="text-lg font-semibold text-green-700">
                  💰 รวมค่าแรงทั้งหมด: {totalWage.toLocaleString()} บาท
                </h3>

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">📎 แนบหลักฐานการจ่ายเงิน</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofFile}
                    className="file-input file-input-bordered w-full"
                  />
                </label>
                {proofFileName && (
                  <p className="text-sm text-gray-600 mt-1">
                    📄 {proofFileName}
                  </p>
                )}

                <button
                  className="btn btn-success w-full mt-4"
                  onClick={handlePaySalary}
                  disabled={!paymentProof || logs.length === 0}
                >
                  ✅ จ่ายเงิน
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
