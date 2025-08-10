import "./AddPage.css";
import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

export default function AddPage() {
  const getToday = () => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // 👉 ตัดให้เหลือ YYYY-MM-DD
  };
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [date, setDate] = useState(getToday());
  const [category, setCategory] = useState("รายจ่าย");
  const [description, setDescription] = useState(""); // ✅ ใช้ description
  const [amount, setAmount] = useState("");
  const userName = localStorage.getItem("username"); // ✅ ดึงชื่อคนที่ login อยู่
  const role = localStorage.getItem("role");
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

    let imageUrl = null;

    // ✅ ถ้ามีไฟล์ → upload ไป Supabase Storage
    if (file) {
      const { data, error } = await supabase.storage
        .from("uploads") // ต้องสร้าง Bucket ชื่อ uploads ใน Supabase
        .upload(`images/${Date.now()}-${file.name}`, file);

      if (error) {
        alert("❌ อัพโหลดไฟล์ไม่สำเร็จ: " + error.message);
        return;
      }

      // ✅ ดึง public URL
      const { data: publicUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);

      imageUrl = publicUrl.publicUrl;
    }

    // ✅ บันทึกข้อมูลลง Table `transactions`
    const { error: insertError } = await supabase.from("transactions").insert([
      {
        date,
        category,
        description,           // ✅ ใช้ description ที่ตรงกับ DB
        amount: parseFloat(amount),
        file_url: imageUrl,
        created_by: userName, // ✅ บันทึกชื่อผู้บันทึก
        status: role === "user" ? "pending" : "approved"  
      },
    ]);

    if (insertError) {
      alert("❌ บันทึกไม่สำเร็จ: " + insertError.message);
    } else {
      alert("✅ บันทึกสำเร็จ!");

      // ✅ Reset ฟอร์ม
      setDate("");
      setCategory("รายจ่าย");
      setDescription("");  // ✅ Reset ตรงนี้
      setAmount("");
      setFile(null);
      setFileName("");
    }
  }

  return (
    <div className="add-root">
      <div className="add-header">บันทึกรายการ</div>

      <form className="add-form" onSubmit={handleSubmit}>
        <label>
          วันที่
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          หมวดหมู่
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>รายรับ</option>
            <option>รายจ่าย</option>
          </select>
        </label>

        <label>
          รายละเอียด
          <input
            type="text"
            placeholder="เช่น เงินเดือน / ค่าอาหาร"
            value={description}                 // ✅ ตรงกัน
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          จำนวนเงิน
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {/* ✅ แนบไฟล์ */}
        <label>
          แนบไฟล์/รูปภาพ
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </label>

        {fileName && <p className="file-preview">📎 เลือกไฟล์: {fileName}</p>}

        <button className="btn-save" type="submit">
          ✅ บันทึกข้อมูล
        </button>
      </form>
    </div>
  );
}
