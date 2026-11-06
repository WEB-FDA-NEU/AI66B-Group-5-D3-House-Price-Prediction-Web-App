// Shared number formatting for charts, insights, comparison and export.
const vi = (value, digits = 2) => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: digits });

/** 6300000000 -> "6,3 tỷ"; values under 1 tỷ -> "850 triệu". */
export function billions(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs < 1e9) return `${vi(value / 1e6, 0)} triệu`;
  return `${vi(value / 1e9, abs >= 1e11 ? 0 : 2)} tỷ`;
}

/** Signed change with an explicit +/− so the sign never relies on colour. */
export function signedBillions(value) {
  if (!Number.isFinite(value) || value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${billions(Math.abs(value))}`;
}

/** VNĐ per m² -> "102 tr/m²". */
export const perM2 = value => Number.isFinite(value) ? `${vi(value / 1e6, 0)} tr/m²` : '—';

export const area = value => Number.isFinite(value) ? `${vi(value, 1)} m²` : '—';

export const count = value => Number(value).toLocaleString('vi-VN');

export const fullVND = value => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(value);

/** Axis ticks: compact, one style per axis. */
export const axisBillions = value => value === 0 ? '0' : `${vi(value / 1e9, 1)} tỷ`;
export const axisArea = value => `${vi(value, 0)}`;
