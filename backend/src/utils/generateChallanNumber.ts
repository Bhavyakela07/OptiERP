import { query } from '../config/db';

export async function generateChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear(); // e.g. 2026
  const prefix = `CH-${currentYear}-`;

  // Find latest challan number for current year
  const res = await query(
    `SELECT challan_number FROM challans WHERE challan_number LIKE $1 ORDER BY challan_number DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (res.rows.length > 0) {
    const lastNumStr = res.rows[0].challan_number;
    const parts = lastNumStr.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSeq = parsedSeq + 1;
      }
    }
  }

  const paddedSeq = String(nextSeq).padStart(4, '0');
  return `${prefix}${paddedSeq}`;
}
