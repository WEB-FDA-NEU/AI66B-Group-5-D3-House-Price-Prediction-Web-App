// US-8 (#49): CSV export for saved predictions.
// Generated in the browser from data the page already loaded, so it works
// with the live API and with USE_MOCK alike.

/**
 * Text that a spreadsheet would treat as a formula is neutralised with a
 * leading apostrophe (OWASP "CSV injection"). Labels are user input.
 */
function guardFormula(text) {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function cell(value) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  const text = guardFormula(String(value));
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {{label: string, value: (row: object) => unknown}[]} columns
 * @param {object[]} rows
 * @returns {string} RFC 4180 CSV with CRLF line endings.
 */
export function toCsv(columns, rows) {
  const lines = [columns.map(c => cell(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map(c => cell(c.value(row))).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** Download with a UTF-8 BOM so Excel shows Vietnamese text correctly. */
export function downloadCsv(filename, csv) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const input = row => row.input ?? row;
const interval = row => row.confidence_interval ?? {};
const pricePerM2 = row => {
  const areaM2 = Number(input(row).area_m2 ?? row.area_m2);
  return areaM2 > 0 && Number.isFinite(row.estimated_price) ? Math.round(row.estimated_price / areaM2) : null;
};

/** One schema for history, detail and comparison exports. Raw numbers, VND. */
export const PREDICTION_COLUMNS = Object.freeze([
  { label: 'Mã dự đoán', value: r => r.id },
  { label: 'Tên gợi nhớ', value: r => r.label || '' },
  { label: 'Ngày tạo (UTC)', value: r => r.created_at },
  { label: 'Tỉnh/thành', value: r => input(r).city ?? '' },
  { label: 'Quận/huyện', value: r => input(r).district ?? r.district },
  { label: 'Loại hình', value: r => input(r).property_type ?? r.property_type },
  { label: 'Diện tích (m²)', value: r => input(r).area_m2 ?? r.area_m2 },
  { label: 'Phòng ngủ', value: r => input(r).bedrooms },
  { label: 'Phòng tắm', value: r => input(r).bathrooms },
  { label: 'Số tầng', value: r => input(r).floors },
  { label: 'Mặt tiền (m)', value: r => input(r).frontage_m },
  { label: 'Đường tiếp cận (m)', value: r => input(r).road_width_m },
  { label: 'Giá ước tính (VNĐ)', value: r => r.estimated_price },
  { label: 'Khoảng thấp (VNĐ)', value: r => interval(r).lower },
  { label: 'Khoảng cao (VNĐ)', value: r => interval(r).upper },
  { label: 'Mức tin cậy', value: r => interval(r).confidence_level },
  { label: 'Giá/m² (VNĐ)', value: pricePerM2 },
  { label: 'Phiên bản mô hình', value: r => r.model_version ?? r.model?.version },
  { label: 'Thuật toán', value: r => r.model?.algorithm ?? '' },
  { label: 'Lưu ý', value: r => r.disclaimer ?? '' },
]);

export function exportPredictions(rows, filename) {
  downloadCsv(filename, toCsv(PREDICTION_COLUMNS, rows));
}

/** Local calendar date for file names (YYYY-MM-DD), not the UTC date. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
