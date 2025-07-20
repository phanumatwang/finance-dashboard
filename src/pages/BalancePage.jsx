import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./BalancePage.css";

export default function BalancePage() {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    const { data, error } = await supabase.from("transactions").select("*");
    if (error) {
      console.error("❌ Fetch error:", error.message);
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    data.forEach((item) => {
      if (item.category === "รายรับ") {
        totalIncome += parseFloat(item.amount);
      } else {
        totalExpense += parseFloat(item.amount);
      }
    });

    setIncome(totalIncome);
    setExpense(totalExpense);
    setBalance(totalIncome - totalExpense);
  }

  return (
    <div className="balance-root">
      <h2>📊 งบดุล</h2>

      <div className="balance-card-container">
        <div className="balance-card income">
          <p>💰 รายรับรวม</p>
          <h3>{income.toLocaleString()} บาท</h3>
        </div>

        <div className="balance-card expense">
          <p>💸 รายจ่ายรวม</p>
          <h3>{expense.toLocaleString()} บาท</h3>
        </div>

        <div className={`balance-card ${balance >= 0 ? "positive" : "negative"}`}>
          <p>🏦 ยอดคงเหลือ</p>
          <h3>{balance.toLocaleString()} บาท</h3>
        </div>
      </div>
    </div>
  );
}
