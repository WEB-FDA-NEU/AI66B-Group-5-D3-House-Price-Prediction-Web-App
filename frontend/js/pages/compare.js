// US-7 (#36): compare 2-3 saved estimates side by side, differences highlighted.
import { getPrediction, ApiError } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { showEmpty, showError } from '../ui.js';
import { barChart } from '../charts.js';
import { billions, perM2, area } from '../format.js';
import { exportPredictions, today } from '../csv.js';
import { compareUrl, idsFromUrl, writeSelection } from '../compare-selection.js';

const content = document.getElementById('compare-content');
const notice = document.getElementById('compare-notice');
const exportButton = document.getElementById('export-compare');
let records = [];

const input = r => r.input ?? r;
const title = r => r.label || `${input(r).property_type ?? r.property_type} tại ${input(r).district ?? r.district}`;
const ppm2 = r => {
  const m2 = Number(input(r).area_m2 ?? r.area_m2);
  return m2 > 0 ? r.estimated_price / m2 : null;
};
const dateText = value => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));
const plain = value => (value == null || value === '' ? '—' : String(value));
const withUnit = unit => value => (value == null || value === '' ? '—' : `${value} ${unit}`);

// kind "range": numbers where highest/lowest are labelled; "same": text that should match.
const ROWS = [
  { label: 'Giá ước tính', get: r => r.estimated_price, format: billions, kind: 'range', strong: true },
  { label: 'Khoảng ước tính', get: r => r.confidence_interval ? `${billions(r.confidence_interval.lower)} – ${billions(r.confidence_interval.upper)}` : null, format: v => v ?? 'Chưa lưu khoảng', kind: 'same' },
  { label: 'Giá mỗi m²', get: ppm2, format: perM2, kind: 'range' },
  { label: 'Tỉnh/thành', get: r => input(r).city, format: plain, kind: 'same' },
  { label: 'Quận/huyện', get: r => input(r).district ?? r.district, format: plain, kind: 'same' },
  { label: 'Loại hình', get: r => input(r).property_type ?? r.property_type, format: plain, kind: 'same' },
  { label: 'Diện tích', get: r => Number(input(r).area_m2 ?? r.area_m2), format: area, kind: 'range' },
  { label: 'Phòng ngủ', get: r => input(r).bedrooms, format: plain, kind: 'range' },
  { label: 'Phòng tắm', get: r => input(r).bathrooms, format: plain, kind: 'range' },
  { label: 'Số tầng', get: r => input(r).floors, format: plain, kind: 'range' },
  { label: 'Mặt tiền', get: r => input(r).frontage_m, format: withUnit('m'), kind: 'range' },
  { label: 'Đường tiếp cận', get: r => input(r).road_width_m, format: withUnit('m'), kind: 'range' },
  { label: 'Mô hình', get: r => r.model_version ?? r.model?.version, format: plain, kind: 'same' },
  { label: 'Ngày lưu', get: r => r.created_at, format: v => (v ? dateText(v) : '—'), kind: 'none' },
];

function badge(text, cls) {
  const tag = document.createElement('span');
  tag.className = `compare-badge compare-badge--${cls}`;
  tag.textContent = text;
  return tag;
}

function renderTable() {
  const wrap = document.createElement('div');
  wrap.className = 'compare-table-wrap';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', 'Bảng so sánh, cuộn ngang trên màn hình nhỏ');
  const table = document.createElement('table');
  table.className = 'compare-table';
  const caption = document.createElement('caption');
  caption.className = 'visually-hidden';
  caption.textContent = `So sánh ${records.length} dự đoán đã lưu`;
  const headRow = document.createElement('tr');
  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.textContent = 'Thông tin';
  headRow.append(corner);
  for (const record of records) {
    const th = document.createElement('th');
    th.scope = 'col';
    const link = document.createElement('a');
    link.href = `detail.html?id=${encodeURIComponent(record.id)}`;
    link.textContent = title(record);
    const others = records.filter(r => r !== record).map(r => String(r.id));
    th.append(link);
    if (others.length >= 2) {
      const remove = document.createElement('a');
      remove.className = 'compare-remove';
      remove.href = compareUrl(others);
      remove.textContent = 'Bỏ khỏi so sánh';
      th.append(remove);
    }
    headRow.append(th);
  }
  const thead = document.createElement('thead');
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  for (const row of ROWS) {
    const values = records.map(row.get);
    const present = values.filter(v => v != null && v !== '' && !(typeof v === 'number' && !Number.isFinite(v)));
    if (!present.length) continue;  // e.g. nobody entered frontage
    const shown = values.map(row.format);
    const differs = row.kind !== 'none' && new Set(shown).size > 1;
    const numeric = row.kind === 'range' && present.every(v => typeof v === 'number');
    const max = numeric ? Math.max(...present) : null;
    const min = numeric ? Math.min(...present) : null;
    const tr = document.createElement('tr');
    if (differs) tr.className = 'is-different';
    if (row.strong) tr.classList.add('is-key');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = row.label;
    if (differs) th.append(badge('Khác nhau', 'diff'));
    tr.append(th);
    values.forEach((value, index) => {
      const td = document.createElement('td');
      const text = document.createElement('span');
      text.textContent = shown[index];
      td.append(text);
      if (differs && numeric && typeof value === 'number' && max !== min) {
        if (value === max) td.append(badge('Cao nhất', 'max'));
        if (value === min) td.append(badge('Thấp nhất', 'min'));
      }
      tr.append(td);
    });
    tbody.append(tr);
  }
  table.append(caption, thead, tbody);
  wrap.append(table);
  return wrap;
}

function renderCharts() {
  const grid = document.createElement('div');
  grid.className = 'compare-charts';
  grid.append(
    barChart({
      title: 'Giá ước tính',
      description: 'Thanh dài hơn là giá ước tính cao hơn. Xem khoảng ước tính trong bảng.',
      data: records, label: title, value: 'estimated_price', format: billions,
      details: r => (r.confidence_interval ? [[`${billions(r.confidence_interval.lower)} – ${billions(r.confidence_interval.upper)}`, 'khoảng ước tính']] : []),
      labelHeading: 'Dự đoán', valueHeading: 'Giá ước tính',
    }),
    barChart({
      title: 'Giá mỗi m²',
      description: 'Giá ước tính chia cho diện tích, để so sánh các tài sản khác kích thước.',
      data: records.map(r => ({ ...r, ppm2: ppm2(r) })).filter(r => Number.isFinite(r.ppm2)),
      label: title, value: 'ppm2', format: perM2, labelHeading: 'Dự đoán', valueHeading: 'Giá/m²',
    }),
  );
  return grid;
}

function emptyState(hint) {
  exportButton.hidden = true;
  showEmpty(content, {
    title: 'Cần ít nhất 2 dự đoán để so sánh',
    hint,
    actionText: 'Chọn từ dự đoán đã lưu',
    actionHref: 'predictions.html',
  });
}

async function load() {
  const { ids, dropped } = idsFromUrl();
  const messages = [];
  if (dropped) messages.push(`Chỉ so sánh tối đa 3 dự đoán; ${dropped} lựa chọn sau đã được bỏ qua.`);
  if (ids.length < 2) {
    emptyState('Đánh dấu "So sánh" trên 2 hoặc 3 dự đoán trong danh sách, rồi bấm So sánh.');
    showNotice(messages);
    return;
  }
  content.textContent = 'Đang tải các dự đoán…';
  content.setAttribute('aria-busy', 'true');
  const outcomes = await Promise.allSettled(ids.map(id => getPrediction(id)));
  content.removeAttribute('aria-busy');
  const failure = outcomes.find(o => o.status === 'rejected' && !(o.reason instanceof ApiError && o.reason.status === 404));
  if (failure) {
    if (failure.reason instanceof ApiError && failure.reason.status === 401) { requireLogin(); return; }
    exportButton.hidden = true;
    showError(content, failure.reason, load);
    return;
  }
  records = outcomes.filter(o => o.status === 'fulfilled').map(o => o.value);
  const missing = outcomes.length - records.length;
  if (missing) messages.push(`${missing} dự đoán không còn tồn tại hoặc không thuộc tài khoản này nên đã được bỏ qua.`);
  writeSelection(records.map(r => String(r.id)));
  showNotice(messages);
  if (records.length < 2) {
    emptyState('Một số dự đoán đã bị xóa. Hãy chọn lại từ danh sách.');
    return;
  }
  document.title = `So sánh ${records.length} dự đoán - HomeVal`;
  exportButton.hidden = false;
  const disclaimer = document.createElement('p');
  disclaimer.className = 'field__hint';
  disclaimer.textContent = 'Các ước tính có thể đến từ những phiên bản mô hình khác nhau và đều dựa trên giá rao 2024; chênh lệch nhỏ hơn khoảng ước tính không nên được xem là khác biệt thật.';
  content.replaceChildren(renderTable(), renderCharts(), disclaimer);
}

function showNotice(messages) {
  notice.hidden = !messages.length;
  notice.textContent = messages.join(' ');
}

exportButton.addEventListener('click', () => {
  exportPredictions(records, `homeval-so-sanh-${today()}.csv`);
});

if (!isLoggedIn()) requireLogin();
else load();
