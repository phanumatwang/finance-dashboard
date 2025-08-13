// ทำ items ให้เป็นรูปแบบเทียบง่าย
export function normalizeItems(items = []) {
  return (items || []).map((it) => ({
    name: (it.name || "").trim(),
    unit: (it.unit || "").trim(),
    qty: Number(it.qty) || 0,
    unit_price: Number(it.unit_price ?? it.price ?? 0),
  }));
}

// เทียบเฉพาะสิ่งที่มีผลต่อ R: items/discount_percent/vat_percent
export function hasContentChanged(original, current) {
  const oItems = JSON.stringify(normalizeItems(original?.items));
  const cItems = JSON.stringify(normalizeItems(current?.items));
  if (oItems !== cItems) return true;

  const od = Number(original?.discount_percent) || 0;
  const cd = Number(current?.discount_percent) || 0;
  if (od !== cd) return true;

  const ov = Number(original?.vat_percent) || 0;
  const cv = Number(current?.vat_percent) || 0;
  if (ov !== cv) return true;

  return false;
}
