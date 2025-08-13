import "./AddPage.css";
import { useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { resizeImageFile } from "../../utils/imageUtils";
import PageLoader from "../../components/PageLoader";
import { useLoading } from "../../components/LoadingContext"; // เพิ่มบรรทัดนี้

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
  // const MAX_FILE_SIZE_MB = 2;
  // const MAX_WIDTH = 1024; // ปรับตามต้องการ
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
  const { setIsLoading } = useLoading(); // ✅ ดึงมาจาก context
  async function handleSubmit(e) {
    e.preventDefault();

    let imageUrl = null;
    setIsLoading(true);
   
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
        description, // ✅ ใช้ description ที่ตรงกับ DB
        amount: parseFloat(amount),
        file_url: imageUrl,
        created_by: userName, // ✅ บันทึกชื่อผู้บันทึก
        status: role === "user" ? "pending" : "approved",
      },
    ]);

    if (insertError) {
      alert("❌ บันทึกไม่สำเร็จ: " + insertError.message);
    } else {
      alert("✅ บันทึกสำเร็จ!");

      // ✅ Reset ฟอร์ม
      setDate("");
      setCategory("รายจ่าย");
      setDescription(""); // ✅ Reset ตรงนี้
      setAmount("");
      setFile(null);
      setFileName("");
    }
    await new Promise((r) => setTimeout(r, 2000)); // simulate
    setIsLoading(false); // ⏳ เริ่มแสดง loading
  }

  return (
    
    <div className="add-root">
       <PageLoader />
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
            value={description} // ✅ ตรงกัน
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
