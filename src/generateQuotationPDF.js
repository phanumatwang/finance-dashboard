import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import thSarabunFont from "./THSarabunNew-normal.js";

// ... imports เหมือนเดิม

export function generateQuotationPDF(quotation, customer, logoUrl) {
  const fmt = (n) =>
    (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return new Promise((resolve, reject) => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // ฟอนต์ไทย + อังกฤษ
    doc.addFileToVFS("THSarabun.ttf", thSarabunFont);
    doc.addFont("THSarabun.ttf", "THSarabun", "normal");
    doc.addFont("THSarabun.ttf", "THSarabun", "bold");
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
      doc.text("Samut Prakan 10540, Thailand", 45, 34);
      doc.text("โทร/Tel: 0-2739-5910  Tax ID: 31523611000", 45, 40);

      // หัวเรื่อง (สองภาษา)
      doc.setFontSize(18);
      doc.text("ใบเสนอราคา / Quotation", 105, 55, { align: "center" });

      // กล่อง เลขที่/วันที่ (มุมมน + 2 ภาษา)
      const boxX = 145, boxY = 15, boxW = 55, boxH = 20, r = 2;
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxW, boxH, r, r);
      doc.line(boxX, boxY + 10, boxX + boxW, boxY + 10);
      doc.line(boxX + 18, boxY, boxX + 18, boxY + boxH);
      doc.setFontSize(12);
      doc.text("เลขที่ / No.", boxX + 3, boxY + 7);
      doc.text("วันที่ / Date", boxX + 3, boxY + 17);
      const docNo = quotation.number || "QU0001";
      const docDate =
        quotation.date ||
        (quotation.created_at
          ? new Date(quotation.created_at).toLocaleDateString("th-TH")
          : new Date().toLocaleDateString("th-TH"));
      doc.text(String(docNo), boxX + 20, boxY + 7);
      doc.text(String(docDate), boxX + 20, boxY + 17);

      // ข้อมูลลูกค้า (สองภาษา)
      doc.setFontSize(13);
      const custY = 65;
      doc.text(`ลูกค้า / Customer: ${customer.name || "-"}`, 14, custY);
      doc.text(`ที่อยู่ / Address: ${customer.address || "-"}`, 14, custY + 7);
      if (customer.tel) doc.text(`โทร / Tel: ${customer.tel}`, 14, custY + 14);

      // ตารางรายการ (หัวตารางสองภาษา)
      const head = [[
        "ลำดับ / No.",
        "รายการ / Description",
        "จำนวน / Qty",
        "หน่วย / Unit",
        "ราคาต่อหน่วย / Unit Price",
        "จำนวนเงิน / Amount",
      ]];

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
          font: "THSarabun",
          fontStyle: "normal",
        },
        columnStyles: {
          0: { halign: "right", cellWidth: 18 },
          1: { cellWidth: 80 },
          2: { halign: "right", cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 28 },
        },
      });

      let y = doc.lastAutoTable.finalY || custY + 20;

      // สรุปสองภาษา (ขวา)
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

      const lines = [
        ["รวมเป็นเงิน / Subtotal", fmt(sub)],
        [`ส่วนลดการค้า / Discount ${discPct}%`, fmt(discAmt)],
        ["ยอดหลังหักส่วนลด / After Discount", fmt(after)],
        [`ภาษีมูลค่าเพิ่ม / VAT ${vatPct}%`, fmt(vatAmt)],
        ["จำนวนเงินทั้งสิ้น / Grand Total", fmt(grand)],
      ];
      const rowH = 7;
      const sumH = lines.length * rowH + 4;

      doc.roundedRect(sumX, y, sumW, sumH, 2, 2);
      for (let i = 1; i < lines.length; i++) {
        doc.line(sumX, y + i * rowH, sumX + sumW, y + i * rowH);
      }
      doc.line(sumX + 47, y, sumX + 47, y + sumH);

      doc.setFontSize(12);
      lines.forEach(([label, val], i) => {
        const yy = y + 5 + i * rowH;
        if (i === lines.length - 1) doc.setFont("THSarabun", "bold");
        doc.text(label, sumX + 3, yy);
        doc.text(val, sumX + sumW - 3, yy, { align: "right" });
        if (i === lines.length - 1) doc.setFont("THSarabun", "normal");
      });

      // หมายเหตุ / Remark
      doc.setFontSize(11);
      doc.text("หมายเหตุ / Remark", 14, y + 5);
      doc.roundedRect(14, y + 7, 95, Math.max(20, sumH - 7), 2, 2);
      if (quotation.note) {
        const linesNote = doc.splitTextToSize(String(quotation.note), 95 - 4);
        doc.text(linesNote, 16, y + 13);
      }

      // ลายเซ็นสองภาษา
      const pageHeight = doc.internal.pageSize.height;
      const signatureY = pageHeight - 40;

      doc.line(30, signatureY, 80, signatureY);
      doc.text("ผู้เสนอราคา / Issued by", 40, signatureY + 6);
      doc.text("วันที่ / Date: .................../................./...................", 30, signatureY + 14);

      doc.line(120, signatureY, 170, signatureY);
      doc.text("ผู้อนุมัติ / Approved by", 133, signatureY + 6);
      doc.text("วันที่ / Date: .................../................./...................", 120, signatureY + 14);

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };

    img.onerror = () => reject(new Error("โหลดโลโก้ไม่สำเร็จ"));
  });
}
