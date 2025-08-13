// แยกเลขฐานและเลข R
export function parseRevision(no = "") {
  const m = /^(.*?)(?:-R(\d+))?$/i.exec((no || "").trim());
  const base = (m && m[1]) || (no || "").trim();
  const revNumber = m && m[2] ? parseInt(m[2], 10) : 0;
  return { base, revNumber };
}

// สร้างเลข R ถัดไป
export function nextRevisionNumber(no = "") {
  const { base, revNumber } = parseRevision(no);
  return `${base}-R${(revNumber || 0) + 1}`;
}

// แสดงเลขล่าสุด (จริง ๆ คือ number ปัจจุบัน)
export function displayLatestNumber(no = "") {
  return (no || "").trim();
}
