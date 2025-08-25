import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useLoading } from "../../components/LoadingContext";

export default function PayrollPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [logs, setLogs] = useState([]);
  const [totalWage, setTotalWage] = useState(0); // รวม "ยอดคงเหลือ" เป็นบาท (แสดงผล)
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofFileName, setProofFileName] = useState("");

  // โหมดการจ่าย
  const [payMode, setPayMode] = useState("full"); // 'full' | 'partial'
  const [partialAmount, setPartialAmount] = useState(0);

  const { setIsLoading } = useLoading();

  // ==== Money helpers (ทำงานเป็น "สตางค์") ====
  const toCents = (v) => Math.round(Number(v || 0) * 100);
  const fromCents = (c) => Number(c || 0) / 100;
  const clampZero = (n) => (n < 0 ? 0 : n);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("time_tracking")
      .select("created_by, status");
    if (error) return console.error(error.message);

    // เอาทุกคนที่ยังมีรายการไม่จ่ายเต็ม (approved/partial)
    const pending = (data || []).filter((r) =>
      ["approved", "partial"].includes(r.status)
    );
    const uniqueUsers = [...new Set(pending.map((u) => u.created_by))];
    setUsers(uniqueUsers);
  }

  async function fetchUserLogs(user) {
    setSelectedUser(user);

    // ค่าแรงที่ยังไม่จ่ายเต็ม (approved/partial)
    const { data, error } = await supabase
      .from("time_tracking")
      .select("*")
      .eq("created_by", user)
      .in("status", ["approved", "partial"])
      .order("date", { ascending: true });

    if (error) {
      console.error("fetchUserLogs error:", error?.message);
      setLogs([]);
      setTotalWage(0);
      return;
    }

    const wageLogs = (data || []).map((row) => ({
      ...row,
      wage_amount: Number(row.wage_amount || 0),
      paid_amount: Number(row.paid_amount || 0),
    }));

    setLogs(wageLogs);

    // รวมยอดคงเหลือทั้งหมด (ใช้สตางค์เพื่อกันปัดเศษ)
    const sumCents = wageLogs.reduce((acc, item) => {
      const wageC = toCents(item.wage_amount);
      const paidC = toCents(item.paid_amount);
      const remainC = clampZero(wageC - paidC);
      return acc + remainC;
    }, 0);
    setTotalWage(fromCents(sumCents)); // แสดงเป็นบาท
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

  // 💸 จ่ายเงิน (เต็ม/แบ่งจ่าย) + บันทึก transactions + อัปเดต paid_amount ไล่ปิดแถว
  async function handlePaySalary() {
    if (!selectedUser) return alert("⚠️ เลือกผู้ใช้ก่อน");
    if (logs.length === 0) return alert("⚠️ ไม่มีรายการที่อนุมัติแล้ว/รอตัด");
    if (!paymentProof) return alert("⚠️ กรุณาแนบหลักฐานการจ่ายเงินก่อน");

    // ยอดคงเหลือทั้งหมด (สตางค์)
    const currentRemainCents = logs.reduce((acc, item) => {
      const wageC = toCents(item.wage_amount);
      const paidC = toCents(item.paid_amount);
      return acc + clampZero(wageC - paidC);
    }, 0);

    let payAmountCents =
      payMode === "full" ? currentRemainCents : toCents(partialAmount);

    if (payMode === "partial") {
      if (payAmountCents <= 0) return alert("⚠️ ใส่ยอดแบ่งจ่ายให้ถูกต้อง");
      if (payAmountCents > currentRemainCents) payAmountCents = currentRemainCents;
    }
    if (payAmountCents <= 0) return alert("ไม่มียอดคงเหลือให้จ่าย");

    setIsLoading(true);
    try {
      // 1) อัปโหลดหลักฐาน
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
      const today = new Date().toISOString().split("T")[0];

      // 2) บันทึกธุรกรรม (ตัดคอลัมน์พิเศษที่ schema อาจไม่มี เช่น ref_type/created_by)
      const payAmountBaht = fromCents(payAmountCents);
      // const currentRemainBaht = fromCents(currentRemainCents);
      const desc =
        payMode === "full"
          ? `ค่าแรง ${selectedUser} (จ่ายเต็ม)`
          : `ค่าแรง ${selectedUser} (แบ่งจ่าย ${payAmountBaht.toLocaleString()} )`;

      const insertTx = await supabase.from("transactions").insert([
        {
          date: today,
          category: "รายจ่าย",
          description: desc,
          amount: payAmountBaht,
          status: "approved",
          file_url: paymentProofUrl,
        },
      ]);
      if (insertTx.error) {
        alert("❌ บันทึก Transaction ไม่สำเร็จ: " + insertTx.error.message);
        return;
      }

      // 3) อัปเดตการจ่ายจริง ไล่จากเก่าสุด → ใหม่สุด (คำนวณเป็นสตางค์)
      const { data: rows, error: rowsErr } = await supabase
        .from("time_tracking")
        .select("id, date, wage_amount, paid_amount, status")
        .eq("created_by", selectedUser)
        .in("status", ["approved", "partial"])
        .order("date", { ascending: true });

      if (rowsErr) {
        alert("โหลดรายการเพื่ออัปเดตการจ่ายล้มเหลว: " + rowsErr.message);
        return;
      }

      let leftCents = payAmountCents;

      for (const row of rows) {
        if (leftCents <= 0) break;

        const wageC = toCents(row.wage_amount);
        const paidC = toCents(row.paid_amount);
        const remainingC = clampZero(wageC - paidC);

        if (remainingC <= 0) {
          await supabase.from("time_tracking").update({ status: "paid" }).eq("id", row.id);
          continue;
        }

        if (leftCents >= remainingC) {
          await supabase
            .from("time_tracking")
            .update({
              paid_amount: fromCents(paidC + remainingC), // บันทึกเป็นบาท
              status: "paid",
            })
            .eq("id", row.id);
          leftCents -= remainingC;
        } else {
          await supabase
            .from("time_tracking")
            .update({
              paid_amount: fromCents(paidC + leftCents), // บาท
              status: "partial",
            })
            .eq("id", row.id);
          leftCents = 0;
        }
      }

      alert(`✅ บันทึกการจ่ายสำเร็จ (${payAmountBaht.toLocaleString()} บาท)`);
      await fetchUserLogs(selectedUser);
      await fetchUsers();
      setPaymentProof(null);
      setProofFileName("");
      setPartialAmount(0);
      setPayMode("full");
    } finally {
      setIsLoading(false);
    }
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
                {/* ตาราง */}
                <h3 className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded">
                  📜 รายการที่รอจ่าย
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
                          <th className="text-right">จ่ายแล้ว</th>
                          {/* <th className="text-right">คงเหลือ</th>
                          <th>สถานะ</th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const wage = Number(log.wage_amount || 0);
                          const paid = Number(log.paid_amount || 0);
                          // const remain = fromCents(
                          //   clampZero(toCents(wage) - toCents(paid))
                          // );
                          return (
                            <tr 
                            className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded"

                            key={log.id}>
                              <td>{log.date}</td>
                              <td>{log.description}</td>
                              <td className="text-right text-green-700 font-semibold">
                                {wage.toLocaleString()} บาท
                              </td>
                              <td className="text-right">{paid.toLocaleString()} บาท</td>
                              {/* <td className="text-right">{remain.toLocaleString()} บาท</td>
                              <td>{log.status}</td> */}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* รวมยอดคงเหลือ */}
                <div className="mt-4 space-y-1">
                 
                  <div  className="text-lg flex justify-between font-bold text-primary bg-secondary px-4 py-2 rounded">
                    <span className="font-semibold">💰 รวมยอดคงเหลือที่ต้องจ่าย</span>
                    <span className="font-bold text-green-700">
                      {totalWage.toLocaleString()} บาท
                    </span>
                  </div>
                </div>

                {/* เลือกโหมดจ่าย */}
                <div className="mt-4 p-3 rounded bg-base-200">
                  <div className="flex items-center gap-4">
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="paymode"
                        className="radio"
                        checked={payMode === "full"}
                        onChange={() => setPayMode("full")}
                      />
                      <span className="ml-2">จ่ายเต็ม</span>
                    </label>
                    <label className="label cursor-pointer">
                      <input
                        type="radio"
                        name="paymode"
                        className="radio"
                        checked={payMode === "partial"}
                        onChange={() => setPayMode("partial")}
                      />
                      <span className="ml-2">แบ่งจ่าย</span>
                    </label>
                  </div>

                  {payMode === "partial" && (
                    <div className="mt-3">
                      <label className="form-control w-full">
                        <div className="label">
                          <span className="label-text">ยอดแบ่งจ่าย</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="เช่น 1500"
                          className="input input-bordered w-full"
                          value={partialAmount}
                          onChange={(e) =>
                            setPartialAmount(parseFloat(e.target.value || 0))
                          }
                        />
                      </label>
                      <p className="text-sm text-gray-600 mt-2">
                        ยอดคงเหลือปัจจุบัน: {totalWage.toLocaleString()} บาท
                      </p>
                    </div>
                  )}
                </div>

                {/* แนบไฟล์ + ปุ่มจ่าย */}
                <label className="form-control w-full mt-4">
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
                  <p className="text-sm text-gray-600 mt-1">📄 {proofFileName}</p>
                )}

                <button
                  className="btn btn-success w-full mt-4"
                  onClick={handlePaySalary}
                  disabled={!paymentProof || logs.length === 0 || totalWage <= 0}
                >
                  ✅ บันทึกการจ่าย
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
