import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import thSarabunFont from "./THSarabunNew-normal.js";

/**
 * สร้าง PDF ใบเสนอราคาแบบมี margin รอบกระดาษ A4
 * - ตารางหลายหน้าได้ พร้อม header ย่อ + เลขหน้า ทุกหน้า
 * - เติมรายการจำลองให้ครบ 20 แถวถ้าน้อยกว่า
 */
export function generateQuotationPDF(quotation, customer, logoUrl) {
  const fmt = (n) =>
    (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return new Promise((resolve, reject) => {
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });

    // ฟอนต์ไทย
    doc.addFileToVFS("THSarabun.ttf", thSarabunFont);
    doc.addFont("THSarabun.ttf", "THSarabun", "normal");
    doc.addFont("THSarabun.ttf", "THSarabun", "bold");
    doc.setFont("THSarabun", "normal");

    // === กำหนดขอบกระดาษ (mm) ===
    const pageMargin = {
      top: 20,     // ขอบบน
      right: 15,   // ขอบขวา
      bottom: 20,  // ขอบล่าง
      left: 15,    // ขอบซ้าย
    };

    // helper: header/เลขหน้า (เรียกทุกหน้าใน didDrawPage)
    const drawPerPageHeaderFooter = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header ย่อ
      doc.setFont("THSarabun", "bold");
      // doc.setFontSize(12);
      // doc.text("ใบเสนอราคา / Quotation", pageMargin.left, 10);
      // doc.setFont("THSarabun", "normal");

      // เส้นคั่นบน
      // doc.setLineWidth(0.2);
      // doc.line(pageMargin.left, 12, pageWidth - pageMargin.right, 12);

      // Footer: เลขหน้า
      const currentPage = doc.internal.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(`หน้า ${currentPage}`, pageWidth - pageMargin.right, pageHeight - 6, { align: "right" });
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;

    img.onload = () => {
      // ===== Header ใหญ่ (หน้าแรก) =====
      // โลโก้ + ข้อมูลบริษัท
      doc.addImage(img, "JPEG", pageMargin.left, pageMargin.top - 10, 30, 30);

      doc.setFontSize(14);
      doc.text("บริษัท ทีพี คอนสตรัคชั่น 235 จำกัด", pageMargin.left + 35, pageMargin.top - 5);
      doc.setFontSize(12);
      doc.text("TP CONSTRUCTION 235 CO., LTD.", pageMargin.left + 35, pageMargin.top + 2);
      doc.text("115/161 หมู่ที่ 8 ตำบลบางแก้ว อำเภอบางพลี", pageMargin.left + 35, pageMargin.top + 8);
      doc.text("Samut Prakan 10540, Thailand", pageMargin.left + 35, pageMargin.top + 14);
      doc.text("โทร/Tel: 0-2739-5910  Tax ID: 31523611000", pageMargin.left + 35, pageMargin.top + 20);

      // หัวเรื่อง
      doc.setFontSize(18);
      doc.text("ใบเสนอราคา / Quotation", doc.internal.pageSize.getWidth() / 2, pageMargin.top + 28, {
        align: "center",
      });

      // กล่องเลขที่/วันที่
      const boxX = doc.internal.pageSize.getWidth() - pageMargin.right - 55;
      const boxY = pageMargin.top - 5;
      const boxW = 55;
      const boxH = 20;
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2);
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

      // ข้อมูลลูกค้า
      doc.setFontSize(13);
      let cursorY = pageMargin.top + 40;
      doc.text(`ลูกค้า / Customer: ${customer?.name || "-"}`, pageMargin.left, cursorY);
      doc.text(`ที่อยู่ / Address: ${customer?.address || "-"}`, pageMargin.left, cursorY + 7);
      if (customer?.tel) doc.text(`โทร / Tel: ${customer.tel}`, pageMargin.left, cursorY + 14);

      // ===== เตรียมตาราง =====
      const head = [[
        "ลำดับ / No.",
        "รายการ / Description",
        "จำนวน / Qty",
        "หน่วย / Unit",
        "ราคาต่อหน่วย / Unit Price",
        "จำนวนเงิน / Amount",
      ]];

      // map items และเติม dummy ให้ครบ 20 แถวถ้าน้อยกว่า
      let itemsArray = (quotation.items || []).map((it, i) => ({
        idx: i + 1,
        name: it.name || "-",
        qty: it.qty ?? 1,
        unit: it.unit || "ชิ้น",
        unit_price: Number(it.unit_price ?? it.price) || 0,
        total:
          Number(it.total ?? (Number(it.qty) || 0) * (Number(it.unit_price) || 0)) || 0,
      }));

      // const MIN_ROWS = 20;
      // if (itemsArray.length < MIN_ROWS) {
      //   const start = itemsArray.length;
      //   for (let i = start; i < MIN_ROWS; i++) {
      //     const qty = (i % 5) + 1; // 1..5
      //     const price = 25 + (i % 6) * 5; // 25,30,35,40,45,50
      //     itemsArray.push({
      //       idx: i + 1,
      //       name: `รายการทดสอบ ${i + 1}`,
      //       qty,
      //       unit: "ชิ้น",
      //       unit_price: price,
      //       total: qty * price,
      //     });
      //   }
      // }

      const body = itemsArray.map((row) => [
        row.idx,
        row.name,
        row.qty,
        row.unit,
        fmt(row.unit_price),
        fmt(row.total),
      ]);

      // ตาราง (หลายหน้า + เคารพ margin ทุกหน้า)
      autoTable(doc, {
        startY: cursorY + 22,           // เริ่มหลังข้อมูลลูกค้า (เฉพาะหน้าแรก)
        margin: pageMargin,             // ใช้ขอบกระดาษรอบด้าน
        head,
        body,
        styles: { font: "THSarabun", fontSize: 14 },
        headStyles: {
          fillColor: [106, 138, 92],
          textColor: 255,
          font: "THSarabun",
          fontStyle: "normal",
        },
        columnStyles: {
          0: { halign: "right", cellWidth: 18 },
          1: { cellWidth: 70 },
          2: { halign: "right", cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { halign: "right", cellWidth: 26 },
          5: { halign: "right", cellWidth: 28 },
        },
        pageBreak: "auto",
        showHead: "everyPage",
        didDrawPage: drawPerPageHeaderFooter, // header/เลขหน้า ทุกหน้า
      });

      // ===== สรุป + หมายเหตุ บนหน้าสุดท้าย =====
      let y = doc.lastAutoTable.finalY || (pageMargin.top + 22);

      // คิดยอดจาก itemsArray (หลังเติม dummy แล้ว)
      const sub =
        Number(quotation.subtotal) ||
        itemsArray.reduce((s, it) => s + (Number(it.total) || 0), 0);

      const discPct = Number(quotation.discount_percent) || 0;
      const discAmt =
        Number(quotation.discount_amount) || (sub * discPct) / 100;

      const after = Number(quotation.after_discount) || sub - discAmt;
      const vatPct = Number(quotation.vat_percent) || 7;
      const vatAmt = Number(quotation.vat_amount) || (after * vatPct) / 100;
      const grand = Number(quotation.total) || after + vatAmt;

      const sumLines = [
        ["รวมเป็นเงิน / Subtotal", fmt(sub)],
        [`ส่วนลดการค้า / Discount ${discPct}%`, fmt(discAmt)],
        ["ยอดหลังหักส่วนลด / After Discount", fmt(after)],
        [`ภาษีมูลค่าเพิ่ม / VAT ${vatPct}%`, fmt(vatAmt)],
        ["จำนวนเงินทั้งสิ้น / Grand Total", fmt(grand)],
      ];

      const rowH = 7;
      const sumW = 80;
      const sumX = doc.internal.pageSize.getWidth() - pageMargin.right - sumW;
      const sumH = sumLines.length * rowH + 4;
      const pageH = doc.internal.pageSize.getHeight();

      // ถ้าพื้นที่ไม่พอ → เปิดหน้าใหม่ แล้ววางหลัง header (คือ pageMargin.top)
      if (y + sumH + 30 > pageH - pageMargin.bottom) {
        doc.addPage();
        drawPerPageHeaderFooter();
        y = pageMargin.top;
      }
      y += 6;

      // กล่องสรุป (ขวา)
      doc.roundedRect(sumX, y, sumW, sumH, 2, 2);
      for (let i = 1; i < sumLines.length; i++) {
        doc.line(sumX, y + i * rowH, sumX + sumW, y + i * rowH);
      }
      doc.line(sumX + 47, y, sumX + 47, y + sumH);

      doc.setFontSize(12);
      sumLines.forEach(([label, val], i) => {
        const yy = y + 5 + i * rowH;
        if (i === sumLines.length - 1) doc.setFont("THSarabun", "bold");
        doc.text(label, sumX + 3, yy);
        doc.text(val, sumX + sumW - 3, yy, { align: "right" });
        if (i === sumLines.length - 1) doc.setFont("THSarabun", "normal");
      });

      // หมายเหตุ (ซ้าย)
      const noteBoxW = sumX - pageMargin.left - 2;
      const noteBoxH = Math.max(20, sumH - 7);
      doc.setFontSize(11);
      doc.text("หมายเหตุ / Remark", pageMargin.left, y + 5);
      doc.roundedRect(pageMargin.left, y + 7, noteBoxW, noteBoxH, 2, 2);
      if (quotation.note) {
        const linesNote = doc.splitTextToSize(String(quotation.note), noteBoxW - 4);
        doc.text(linesNote, pageMargin.left + 2, y + 13);
      }

      // ลายเซ็น (ท้ายหน้าสุดท้าย)
      const signYBase = Math.max(y + sumH + 22, pageH - 40);
      doc.line(30, signYBase, 80, signYBase);
      doc.text("ผู้เสนอราคา / Issued by", 40, signYBase + 6);
      doc.text("วันที่ / Date: .................../................./...................", 30, signYBase + 14);

      doc.line(120, signYBase, 170, signYBase);
      doc.text("ผู้อนุมัติ / Approved by", 133, signYBase + 6);
      doc.text("วันที่ / Date: .................../................./...................", 120, signYBase + 14);

      // ออกไฟล์
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };

    img.onerror = () => reject(new Error("โหลดโลโก้ไม่สำเร็จ"));
  });
}
