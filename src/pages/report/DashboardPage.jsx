import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./DashboardPage.css";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

export default function DashboardPage() {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [monthlyRows, setMonthlyRows] = useState([]); // สำหรับ Recharts หลัก
  const [monthMeta, setMonthMeta] = useState([]);     // meta breakdown ต่อเดือน (ไว้ใช้ tooltip/กราฟย่อย)
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "approved");

    if (error) {
      console.error("❌ Fetch error:", error.message);
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const map = {}; // key: YYYY-MM -> aggregate

    data.forEach((item) => {
      const dt = new Date(item.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = dt.toLocaleString("th-TH", {
        month: "short",
        year: "2-digit",
      });

      if (!map[key]) {
        map[key] = {
          key,
          month: monthLabel,
          income: 0,
          expense: 0,
          breakdown: {
            incomeTypes: {},   // {type: sum}
            expenseTypes: {},  // {type: sum}
            incomeDesc: {},    // {desc: sum}
            expenseDesc: {},   // {desc: sum}
          },
        };
      }

      const amount = Number(item.amount) || 0;
      const typeName = (item.type || "อื่นๆ").toString();
      const desc = (item.description || "—").toString();

      if (item.category === "รายรับ") {
        totalIncome += amount;
        map[key].income += amount;
        map[key].breakdown.incomeTypes[typeName] =
          (map[key].breakdown.incomeTypes[typeName] || 0) + amount;
        map[key].breakdown.incomeDesc[desc] =
          (map[key].breakdown.incomeDesc[desc] || 0) + amount;
      } else {
        totalExpense += amount;
        map[key].expense += amount;
        map[key].breakdown.expenseTypes[typeName] =
          (map[key].breakdown.expenseTypes[typeName] || 0) + amount;
        map[key].breakdown.expenseDesc[desc] =
          (map[key].breakdown.expenseDesc[desc] || 0) + amount;
      }
    });

    setIncome(totalIncome);
    setExpense(totalExpense);
    setBalance(totalIncome - totalExpense);

    const arr = Object.values(map).sort((a, b) => (a.key < b.key ? -1 : 1));

    // rows สำหรับ Recharts หลัก
    const rows = arr.map((m) => ({
      month: m.month,
      income: m.income,
      expense: m.expense,
    }));

    setMonthlyRows(rows);
    setMonthMeta(arr);
    setSelectedMonthIdx(arr.length ? arr.length - 1 : null); // default เลือกเดือนล่าสุด
  }

  // สีอัตโนมัติสำหรับ type (กราฟย่อย)
  const colorFor = (i) => `hsl(${(i * 57) % 360} 70% 50%)`;
  const fmt = (n) => (n ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

  // Tooltip หลัก (แสดง breakdown top 5 ของเดือนที่ hover)
  function MainTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    // หา meta ของ label (เดือน)
    const idx = monthMeta.findIndex((m) => m.month === label);
    if (idx < 0) return (
      <div className="chart-tooltip">
        <div className="tt-head">📅 {label}</div>
        <div>—</div>
      </div>
    );
    const meta = monthMeta[idx];
    const top = (obj, limit = 10) =>
      Object.entries(obj)
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => (b.v ?? 0) - (a.v ?? 0))
        .slice(0, limit);

    const it = top(meta.breakdown.incomeTypes);
    const id = top(meta.breakdown.incomeDesc);
    const et = top(meta.breakdown.expenseTypes);
    const ed = top(meta.breakdown.expenseDesc);

    return (
      <div className="chart-tooltip">
        <div className="tt-head">📅 {meta.month}</div>

        <div className="tt-row"><b>รายรับรวม:</b> {fmt(meta.income)} บาท</div>
        <div className="tt-row"><b>รายจ่ายรวม:</b> {fmt(meta.expense)} บาท</div>

        <div className="tt-section">
          <div className="tt-title">💰 รายรับตามประเภท (Top 5)</div>
          <ul className="tt-list">
            {it.length ? it.map(({ k, v }) => <li key={`it-${k}`}>{k}: <b>{fmt(v)}</b></li>) : <li>—</li>}
          </ul>
        </div>

        <div className="tt-section">
          <div className="tt-title">📝 รายรับ (Top 5)</div>
          <ul className="tt-list">
            {id.length ? id.map(({ k, v }, i) => <li key={`id-${i}`}>{k}: <b>{fmt(v)}</b></li>) : <li>—</li>}
          </ul>
        </div>

        <div className="tt-section">
          <div className="tt-title">💸 รายจ่ายตามประเภท (Top 5)</div>
          <ul className="tt-list">
            {et.length ? et.map(({ k, v }) => <li key={`et-${k}`}>{k}: <b>{fmt(v)}</b></li>) : <li>—</li>}
          </ul>
        </div>

        <div className="tt-section">
          <div className="tt-title">📝 รายจ่าย (Top 5)</div>
          <ul className="tt-list">
            {ed.length ? ed.map(({ k, v }, i) => <li key={`ed-${i}`}>{k}: <b>{fmt(v)}</b></li>) : <li>—</li>}
          </ul>
        </div>
      </div>
    );
  }

  // จัดเตรียมข้อมูลสำหรับ "กราฟย่อยตามประเภท" ของเดือนที่เลือก
  const selectedMeta = useMemo(() => {
    if (selectedMonthIdx == null) return null;
    return monthMeta[selectedMonthIdx] || null;
  }, [selectedMonthIdx, monthMeta]);

  const breakdownBars = useMemo(() => {
    if (!selectedMeta) return { incomeKeys: [], expenseKeys: [], data: [] };

    const incomeTypes = Object.entries(selectedMeta.breakdown.incomeTypes)
      .map(([type, amount]) => ({ type, amount }));
    const expenseTypes = Object.entries(selectedMeta.breakdown.expenseTypes)
      .map(([type, amount]) => ({ type, amount }));

    // ทำ row เดียว มีฟิลด์ dynamic ตาม type
    const row = { label: selectedMeta.month };
    const incomeKeys = [];
    incomeTypes.forEach((t) => {
      const k = `in:${t.type}`;
      row[k] = t.amount;
      incomeKeys.push(k);
    });
    const expenseKeys = [];
    expenseTypes.forEach((t) => {
      const k = `ex:${t.type}`;
      row[k] = t.amount;
      expenseKeys.push(k);
    });

    return { incomeKeys, expenseKeys, data: [row] };
  }, [selectedMeta]);

  // สีตาม index (แยก income กับ expense ให้ต่อเนื่อง)
  const keyColor = (k, i) => colorFor(i);

  // handler: คลิกแท่ง/แกน เพื่อเลือกเดือน
  const onBarClick = (state) => {
    // state.activeLabel คือ label ของแกน X (เดือน)
    const idx = monthMeta.findIndex((m) => m.month === state.activeLabel);
    if (idx >= 0) setSelectedMonthIdx(idx);
  };

  return (
    <div className="dashboard-root">
      <h2>📊 ภาพรวมข้อมูล</h2>

      {/* ✅ การ์ดสรุป */}
      <div className="dashboard-card-container">
        <div className="dashboard-card income">
          <p>💰 รายรับรวม</p>
          <h3>{fmt(income)} บาท</h3>
        </div>

        <div className="dashboard-card expense">
          <p>💸 รายจ่ายรวม</p>
          <h3>{fmt(expense)} บาท</h3>
        </div>

        <div className={`dashboard-card ${balance >= 0 ? "positive" : "negative"}`}>
          <p>🏦 ยอดคงเหลือ</p>
          <h3>{fmt(balance)} บาท</h3>
        </div>
      </div>

      {/* ✅ กราฟหลัก: รายรับ/รายจ่าย รายเดือน */}
      <h3 className="chart-title">📈 แนวโน้มรายเดือน</h3>
      <div className="chart-box">
        {monthlyRows.length === 0 ? (
          <p>ยังไม่มีข้อมูลเพียงพอ</p>
        ) : (
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart
                data={monthlyRows}
                onClick={onBarClick}
                margin={{ top: 20, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<MainTooltip />} />
                <Legend />
                {/* รายรับ */}
                <Bar dataKey="income" name="รายรับ" fill="#10b981">
                  <LabelList dataKey="income" position="top" formatter={(v) => fmt(v)} />
                </Bar>
                {/* รายจ่าย */}
                <Bar dataKey="expense" name="รายจ่าย" fill="#ef4444">
                  <LabelList dataKey="expense" position="top" formatter={(v) => fmt(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ✅ กราฟย่อย: แยกตามประเภทของเดือนที่เลือก */}
      {selectedMeta && (
        <>
          <h3 className="chart-title" style={{ marginTop: 18 }}>
            🔍 รายละเอียดตามประเภท: {selectedMeta.month}
          </h3>
          <div className="chart-box">
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart
                  data={breakdownBars.data}
                  margin={{ top: 20, right: 10, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip
                    formatter={(val, name) => {
                      // name = in:Type หรือ ex:Type
                      const isIncome = String(name).startsWith("in:");
                      const label = String(name).slice(3);
                      return [`${fmt(val)} บาท`, `${isIncome ? "รายรับ" : "รายจ่าย"} • ${label}`];
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const isIncome = String(value).startsWith("in:");
                      return `${isIncome ? "รายรับ" : "รายจ่าย"} • ${String(value).slice(3)}`;
                    }}
                  />

                  {/* income types (stack เดียวกัน) */}
                  {breakdownBars.incomeKeys.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="income"
                      fill={keyColor(k, i)}
                      name={k}
                    />
                  ))}

                  {/* expense types (อีก stack) */}
                  {breakdownBars.expenseKeys.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="expense"
                      fill={keyColor(k, i + breakdownBars.incomeKeys.length)}
                      name={k}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
