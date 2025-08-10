import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import thSarabunFont from "./THSarabunNew-normal.js";

export function generateQuotationPDF(quotation, customer, logoUrl) {
  const fmt = (n) =>
    (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return new Promise((resolve, reject) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // ไทย
    doc.addFileToVFS("THSarabun.ttf", thSarabunFont);
    doc.addFont("THSarabun.ttf", "THSarabun", "normal");
    doc.addFont("THSarabun.ttf", "THSarabun", "bold");   // ✅ ให้ใช้ตัวหนาได้
    doc.setFont("THSarabun", "normal");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;

    img.onload = () => {
      // โลโก้ + บริษัท
      doc.addImage(img, "JPEG", 10, 10, 30, 30);

      doc.setFontSize(14);
      doc.text("บริษัท ทีพี คอนสตรัคชั่น 235 จำกัด", 45, 15);
      doc.setFontSize(12);
      doc.text("TP CONSTRUCTION 235 CO., LTD.", 45, 22);
      doc.text("115/161 หมู่ที่ 8 ตำบลบางแก้ว อำเภอบางพลี", 45, 28);
      doc.text("จ.สมุทรปราการ 10540", 45, 34);
      doc.text("โทร: 0-2739-5910 เลขประจำตัวผู้เสียภาษี 31523611000", 45, 40);

      // หัวเรื่อง
      doc.setFontSize(18);
      doc.text("ใบเสนอราคา", 105, 55, { align: "center" });

      // กล่อง เลขที่/วันที่ (มุมมน)
      const boxX = 145, boxY = 15, boxW = 55, boxH = 20, r = 2;
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxW, boxH, r, r);
      doc.line(boxX, boxY + 10, boxX + boxW, boxY + 10);     // แบ่งแนวนอน
      doc.line(boxX + 16, boxY, boxX + 16, boxY + boxH);     // แบ่งแนวตั้ง
      doc.setFontSize(12);
      doc.text("เลขที่", boxX + 3, boxY + 7);
      doc.text("วันที่", boxX + 3, boxY + 17);
      const docNo = quotation.number || "QU0001";
      const docDate =
        quotation.date ||
        (quotation.created_at
          ? new Date(quotation.created_at).toLocaleDateString("th-TH")
          : new Date().toLocaleDateString("th-TH"));
      doc.text(String(docNo), boxX + 18, boxY + 7);
      doc.text(String(docDate), boxX + 18, boxY + 17);

      // ข้อมูลลูกค้า
      doc.setFontSize(13);
      const custY = 65;
      doc.text(`ลูกค้า: ${customer.name || "-"}`, 14, custY);
      doc.text(`ที่อยู่: ${customer.address || "-"}`, 14, custY + 7);
      if (customer.tel) doc.text(`โทร: ${customer.tel}`, 14, custY + 14);

      // ตารางรายการ
      const head = [["ลำดับ", "รายการ", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "จำนวนเงิน"]];
      const body = (quotation.items || []).map((it, i) => [
        i + 1,
        it.name || "-",
        it.qty ?? 1,
        it.unit || "ชิ้น",
        fmt(it.unit_price ?? it.price),
        fmt(it.total ?? (Number(it.qty) || 0) * (Number(it.unit_price) || 0)),
      ]);

      autoTable(doc, {
        startY: custY + 20,
        margin: { left: 14, right: 14 },
        head,
        body,
        styles: { font: "THSarabun", fontSize: 14 },
        headStyles: {
          fillColor: [106, 138, 92],
          font: "THSarabun",     // ✅ เพิ่มตรงนี้
          fontStyle: "normal",   // หรือ "bold" ถ้าต้องการ
        },
        columnStyles: {
          0: { halign: "right", cellWidth: 14 },
          1: { cellWidth: 84 },
          2: { halign: "right", cellWidth: 20 },
          3: { cellWidth: 18 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 28 },
        },
        didParseCell: (data) => {
          // ให้บรรทัดรวมดูแน่นหน่อย
          if (data.section === "body") data.cell.styles.lineColor = [220, 224, 217];
        },
      });

      let y = doc.lastAutoTable.finalY || custY + 20;

      // กล่องสรุปทางขวา
      const sumX = 120, sumW = 80;
      y += 6;

      const sub = Number(quotation.subtotal) || (quotation.items || []).reduce(
        (s, it) => s + ((Number(it.qty) || 0) * (Number(it.unit_price) || 0)),
        0
      );
      const discPct = Number(quotation.discount_percent) || 0;
      const discAmt = Number(quotation.discount_amount) || (sub * discPct) / 100;
      const after = Number(quotation.after_discount) || sub - discAmt;
      const vatPct = Number(quotation.vat_percent) || 7;
      const vatAmt = Number(quotation.vat_amount) || (after * vatPct) / 100;
      const grand = Number(quotation.total) || after + vatAmt;

      // กรอบ
      const lines = [
        ["รวมเป็นเงิน", fmt(sub)],
        [`ส่วนลดการค้า ${fmt(discPct).replace(/\.00$/, "")}%`, fmt(discAmt)],
        ["ยอดหลังหักส่วนลด", fmt(after)],
        [`ภาษีมูลค่าเพิ่ม ${fmt(vatPct).replace(/\.00$/, "")}%`, fmt(vatAmt)],
        ["จำนวนเงินทั้งสิ้น", fmt(grand)],
      ];
      const rowH = 7;
      const sumH = lines.length * rowH + 4;
      doc.roundedRect(sumX, y, sumW, sumH, 2, 2);
      // แบ่งแถว
      for (let i = 1; i < lines.length; i++) {
        doc.line(sumX, y + i * rowH, sumX + sumW, y + i * rowH);
      }
      // แบ่งคอลัมน์
      doc.line(sumX + 45, y, sumX + 45, y + sumH);

      doc.setFontSize(12);
      lines.forEach(([label, val], i) => {
        const yy = y + 5 + i * rowH;
        if (i === lines.length - 1) doc.setFont("THSarabun", "bold");   // ✅ ใช้ bold ของ Sarabun
        doc.text(label, sumX + 3, yy);
        doc.text(val, sumX + sumW - 3, yy, { align: "right" });
        if (i === lines.length - 1) doc.setFont("THSarabun", "normal"); // ✅ กลับมา normal
      });

      doc.setFont("THSarabun", "normal");
      // หมายเหตุ (ซ้าย)
      doc.setFontSize(11);
      doc.text("หมายเหตุ", 14, y + 5);
      doc.roundedRect(14, y + 7, 95, Math.max(20, sumH - 7), 2, 2);
      if (quotation.note) {
        const linesNote = doc.splitTextToSize(String(quotation.note), 95 - 4);
        doc.text(linesNote, 16, y + 13);
      }

      // ลายเซ็น - อยู่ล่างสุด แต่ไม่ทับเนื้อหา
      const pageHeight = doc.internal.pageSize.height;

      // 👉 ความสูงลายเซ็นจากล่างขึ้นบน
      const signatureMargin = 40;
      const signatureY = pageHeight - signatureMargin;

      doc.line(30, signatureY, 80, signatureY); // เส้นลายเซ็น
      doc.text("ผู้เสนอราคา", 50, signatureY + 6);
      doc.text("วันที่: ...................../........................../....................", 30, signatureY + 14);

      doc.line(120, signatureY, 170, signatureY);
      doc.text("ผู้อนุมัติ", 140, signatureY + 6);
      doc.text("วันที่: ..................../........................../.....................", 120, signatureY + 14);


      // ส่งออก
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };

    img.onerror = () => reject(new Error("โหลดโลโก้ไม่สำเร็จ"));
  });
}
