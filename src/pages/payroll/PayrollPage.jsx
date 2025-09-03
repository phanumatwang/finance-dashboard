import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useLoading } from "../../components/LoadingContext";

export default function PayrollPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [logs, setLogs] = useState([]); // รายการค้างจ่าย (approved/partial) สำหรับตัดจ่าย
  const [allLogs, setAllLogs] = useState([]); // รายการทั้งหมด ทุกสถานะ (แสดงในตาราง)
  const [totalWage, setTotalWage] = useState(0); // รวมคงเหลือที่ต้องจ่าย (บาท) จาก pending
  const [paymentProof, setPaymentProof] = useState(null);
  const [proofFileName, setProofFileName] = useState("");
  const [payMode, setPayMode] = useState("full"); // 'full' | 'partial'
  const [partialAmount, setPartialAmount] = useState(0);
  const [extraDesc, setExtraDesc] = useState("");
  const thMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const prettyMonth = (yyyyMM) => {
    if (!yyyyMM) return "";
    const [yy, mm] = yyyyMM.split("-").map(Number);
    return `${thMonths[(mm || 1) - 1]} ${yy}`;
  };
  // คืนค่าเดือนปัจจุบันเป็น "YYYY-MM"
  const currentYYYYMM = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // YYYY-MM
  });

  const { setIsLoading } = useLoading();

  // ===== Money helpers (สตางค์) =====
  const toCents = (v) => Math.round(Number(v || 0) * 100);
  const fromCents = (c) => Number(c || 0) / 100;
  const clampZero = (n) => (n < 0 ? 0 : n);

  // ===== Month helpers =====
  function getMonthRange(yyyyMM) {
    const [y, m] = yyyyMM.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1); // exclusive
    const toIso = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD
    return { startDate: toIso(start), endDate: toIso(end) };
  }
  function shiftMonth(delta) {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${yy}-${mm}`);
  }

  useEffect(() => {
    if (selectedUser) fetchUserLogs(selectedUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("time_tracking")
      .select("created_by")
      .not("created_by", "is", null) // กันค่า null
      .order("created_by", { ascending: true });

    if (error) return console.error(error.message);

    const uniqueUsers = [...new Set((data || []).map((r) => r.created_by))];
    setUsers(uniqueUsers);
  }

  async function fetchUserLogs(user) {
    setSelectedUser(user);
    const { startDate, endDate } = getMonthRange(selectedMonth);

    // 1) สำหรับตัดจ่าย: เอาเฉพาะ approved/partial ภายในเดือนที่เลือก
    const { data: pendData, error: pendErr } = await supabase
      .from("time_tracking")
      .select("*")
      .eq("created_by", user)
      .in("status", ["approved", "partial"])
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: true });

    if (pendErr) {
      console.error("fetchUserLogs(pending) error:", pendErr?.message);
      setLogs([]);
      setTotalWage(0);
    } else {
      const wageLogs = (pendData || []).map((row) => ({
        ...row,
        wage_amount: Number(row.wage_amount || 0),
        paid_amount: Number(row.paid_amount || 0),
      }));
      setLogs(wageLogs);
      const sumCents = wageLogs.reduce((acc, item) => {
        const wageC = toCents(item.wage_amount);
        const paidC = toCents(item.paid_amount);
        return acc + clampZero(wageC - paidC);
      }, 0);
      setTotalWage(fromCents(sumCents));
    }

    // 2) สำหรับแสดงผล: "ทุกรายการ ทุกสถานะ" ของเดือนนั้น
    const { data: allRows, error: allErr } = await supabase
      .from("time_tracking")
      .select("id, date, wage_amount, paid_amount, status, description")
      .eq("created_by", user)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: true });

    if (allErr) {
      console.error("fetchUserLogs(all) error:", allErr?.message);
      setAllLogs([]);
      return;
    }
    const rows = (allRows || []).map((r) => ({
      ...r,
      wage_amount: Number(r.wage_amount || 0),
      paid_amount: Number(r.paid_amount || 0),
    }));
    setAllLogs(rows);
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
    if (logs.length === 0)
      return alert("⚠️ ไม่มีรายการที่อนุมัติแล้ว/รอตัดในเดือนนี้");
    if (!paymentProof) return alert("⚠️ กรุณาแนบหลักฐานการจ่ายเงินก่อน");

    const currentRemainCents = logs.reduce((acc, item) => {
      const wageC = toCents(item.wage_amount);
      const paidC = toCents(item.paid_amount);
      return acc + clampZero(wageC - paidC);
    }, 0);

    let payAmountCents =
      payMode === "full" ? currentRemainCents : toCents(partialAmount);

    if (payMode === "partial") {
      if (payAmountCents <= 0) return alert("⚠️ ใส่ยอดแบ่งจ่ายให้ถูกต้อง");
      if (payAmountCents > currentRemainCents)
        payAmountCents = currentRemainCents;
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

      // 2) บันทึกธุรกรรม (มีระบุเดือน + รายละเอียดเพิ่มถ้ามี)
      const payAmountBaht = fromCents(payAmountCents);
      const desc =
        payMode === "full"
          ? `ค่าแรง ${selectedUser} (จ่ายเต็ม) - เดือน ${selectedMonth}`
          : `ค่าแรง ${selectedUser} (แบ่งจ่าย ${payAmountBaht.toLocaleString()} ) - เดือน ${selectedMonth}`;
      const finalDesc = extraDesc.trim()
        ? `${desc} - ${extraDesc.trim()}`
        : desc;

      const insertTx = await supabase.from("transactions").insert([
        {
          date: today,
          category: "รายจ่าย",
          description: finalDesc,
          amount: payAmountBaht,
          status: "approved",
          file_url: paymentProofUrl,
        },
      ]);
      if (insertTx.error) {
        alert("❌ บันทึก Transaction ไม่สำเร็จ: " + insertTx.error.message);
        return;
      }

      // 3) อัปเดตการจ่ายจริง ไล่จากเก่าสุด → ใหม่สุด (เฉพาะเดือนที่เลือก)
      const { startDate, endDate } = getMonthRange(selectedMonth);
      const { data: rows, error: rowsErr } = await supabase
        .from("time_tracking")
        .select("id, date, wage_amount, paid_amount, status")
        .eq("created_by", selectedUser)
        .in("status", ["approved", "partial"])
        .gte("date", startDate)
        .lt("date", endDate)
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
          await supabase
            .from("time_tracking")
            .update({ status: "paid" })
            .eq("id", row.id);
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
      setExtraDesc("");
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

            {/* เลือกเดือน (พร้อมปุ่มเลื่อน) */}
            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">🗓 เลือกเดือน</span>
                    {/* ชื่อเดือนแบบไทย */}
                    <span className="badge badge-outline">
                      {prettyMonth(selectedMonth)}
                    </span>
                  </div>

                  {/* กลุ่มอินพุต + ปุ่มเลื่อนเดือน */}
                  <div className="join w-full">
                    <button
                      type="button"
                      className="btn join-item btn-ghost"
                      title="เดือนก่อนหน้า"
                      onClick={() => shiftMonth(-1)}
                    >
                      ◀
                    </button>

                    <input
                      type="month"
                      className="join-item input input-bordered w-full"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />

                    <button
                      type="button"
                      className="btn join-item btn-ghost"
                      title="เดือนถัดไป"
                      onClick={() => shiftMonth(+1)}
                    >
                      ▶
                    </button>
                  </div>
                </label>

                {/* ปุ่มไปเดือนปัจจุบัน (ซ้าย/ขวาบนมือถือยังอยู่ใน join แล้ว) */}
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSelectedMonth(currentYYYYMM())}
                  title="กระโดดไปเดือนนี้"
                >
                  เดือนนี้
                </button>
              </div>

              {/* บรรทัดช่วยอธิบายเล็ก ๆ */}
              <div className="text-xs text-gray-500">
                เดือนที่เลือก:{" "}
                <span className="font-semibold">
                  {prettyMonth(selectedMonth)}
                </span>
              </div>
            </div>

            {/* เลือกพนักงาน */}
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
                {/* ตาราง: ทุกรายการ ทุกสถานะ ของเดือนที่เลือก */}
                <h3 className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded">
                  📜 รายการทั้งหมด (เดือน {selectedMonth})
                </h3>
                {allLogs.length === 0 ? (
                  <p className="text-gray-500">ไม่มีข้อมูลในเดือนนี้</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full mt-4">
                      <thead>
                        <tr>
                          <th>📅 วันที่</th>
                          <th>📝 รายละเอียด</th>
                          <th className="text-right">💰 ค่าแรง</th>
                          <th className="text-right">จ่ายแล้ว</th>
                          
                        </tr>
                      </thead>
                      <tbody>
                        {allLogs.map((log) => {
                          const wage = Number(log.wage_amount || 0);
                          const paid = Math.min(
                            Number(log.paid_amount || 0),
                            wage
                          );
                          // const remain = fromCents(
                          //   clampZero(toCents(wage) - toCents(paid))
                          // );
                          // const badgeClass =
                          //   log.status === "paid"
                          //     ? "badge-success"
                          //     : log.status === "partial"
                          //     ? "badge-warning"
                          //     : "badge-info";
                          return (
                            <tr className="text-lg font-bold text-primary bg-secondary px-4 py-2 rounded" key={log.id}>
                              <td>{log.date}</td>
                              <td className="max-w-[380px] md:max-w-none truncate">
                                {log.description || "-"}
                              </td>
                              <td className="text-right text-green-700 font-semibold">
                                {wage.toLocaleString()} บาท
                              </td>
                              <td className="text-right">
                                {paid.toLocaleString()} บาท
                              </td>
                            
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* รวมยอดคงเหลือ (เฉพาะรายการค้างจ่าย) */}
                <div className="mt-4 space-y-1">
                  <div className="text-lg flex justify-between font-bold text-primary bg-secondary px-4 py-2 rounded">
                    <span className="font-semibold">
                      💰 รวมยอดคงเหลือที่ต้องจ่าย (approved/partial)
                    </span>
                    <span className="font-bold text-green-700">
                      {totalWage.toLocaleString()} บาท
                    </span>
                  </div>
                </div>

                {/* เลือกโหมดจ่าย */}
                <div className="mt-4 p-3 rounded bg-base-200">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
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
                      <div className="flex-1">
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
                </div>

                {/* แนบไฟล์ + รายละเอียดเพิ่ม + ปุ่มจ่าย */}
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
                  <p className="text-sm text-gray-600 mt-1">
                    📄 {proofFileName}
                  </p>
                )}

                <label className="form-control w-full">
                  <div className="label">
                    <span className="label-text">
                      🧾 รายละเอียดเพิ่มเติม (ต่อท้ายคำอธิบาย)
                    </span>
                  </div>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="เช่น งวด 1/2568 | งานติดตั้งไซต์ A | โอนผ่านธนาคาร"
                    value={extraDesc}
                    onChange={(e) => setExtraDesc(e.target.value)}
                  />
                </label>

                <button
                  className="btn btn-success w-full mt-4"
                  onClick={handlePaySalary}
                  disabled={
                    !paymentProof || logs.length === 0 || totalWage <= 0
                  }
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
