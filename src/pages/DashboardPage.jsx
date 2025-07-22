import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./DashboardPage.css";

export default function DashboardPage() {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    // ✅ ดึงเฉพาะรายการที่อนุมัติแล้ว
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "approved"); // ✅ เฉพาะ status = approved

    if (error) {
      console.error("❌ Fetch error:", error.message);
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    let monthlySummary = {};

    data.forEach((item) => {
      const month = new Date(item.date).toLocaleString("th-TH", {
        month: "short",
      });

      if (!monthlySummary[month]) {
        monthlySummary[month] = { income: 0, expense: 0 };
      }

      if (item.category === "รายรับ") {
        totalIncome += parseFloat(item.amount);
        monthlySummary[month].income += parseFloat(item.amount);
      } else {
        totalExpense += parseFloat(item.amount);
        monthlySummary[month].expense += parseFloat(item.amount);
      }
    });

    setIncome(totalIncome);
    setExpense(totalExpense);
    setBalance(totalIncome - totalExpense);

    // แปลง Object → Array เพื่อนำไป render chart
    const monthlyArr = Object.keys(monthlySummary).map((month) => ({
      month,
      income: monthlySummary[month].income,
      expense: monthlySummary[month].expense,
    }));

    setMonthlyData(monthlyArr);
  }

  return (
    <div className="dashboard-root">
      <h2>📊 ภาพรวมข้อมูล</h2>

      {/* ✅ การ์ดสรุป */}
      <div className="dashboard-card-container">
        <div className="dashboard-card income">
          <p>💰 รายรับรวม</p>
          <h3>{income.toLocaleString()} บาท</h3>
        </div>

        <div className="dashboard-card expense">
          <p>💸 รายจ่ายรวม</p>
          <h3>{expense.toLocaleString()} บาท</h3>
        </div>

        <div
          className={`dashboard-card ${balance >= 0 ? "positive" : "negative"}`}
        >
          <p>🏦 ยอดคงเหลือ</p>
          <h3>{balance.toLocaleString()} บาท</h3>
        </div>
      </div>

      {/* ✅ แนวโน้มรายเดือน */}
      <h3 className="chart-title">📈 แนวโน้มรายเดือน</h3>
      <div className="chart-box">
        {monthlyData.length === 0 ? (
          <p>ยังไม่มีข้อมูลเพียงพอ</p>
        ) : (
          <div className="chart-grid">
            {monthlyData.map((m, idx) => (
              <div key={idx} className="chart-item">
                <span>{m.month}</span>
                <div className="chart-bar">
                  <div
                    className="bar-income"
                    style={{ height: `${Math.min(m.income / 1000, 100)}px` }}
                  ></div>
                  <div
                    className="bar-expense"
                    style={{ height: `${Math.min(m.expense / 1000, 100)}px` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
