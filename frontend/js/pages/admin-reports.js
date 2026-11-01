import { requireAdmin } from '../auth.js';
import { getAdminReports } from '../api.js';
import { showEmpty, showError } from '../ui.js';
import { el, money } from '../model-catalog.js';
import { propertyFacts } from '../property.js';

const PAGE_SIZE = 10;
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const STATUS_LABELS = { open: 'Đang mở', closed: 'Đã đóng' };

function initPage() {
if (!requireAdmin()) return;

const filterForm = document.getElementById('filter-form');
const listEl = document.getElementById('list');
const alertBox = document.getElementById('alert');
const pager = document.getElementById('pager');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const dialog = document.getElementById('report-dialog');
const detailEl = document.getElementById('report-detail');
let page = 1;

async function load() {
  listEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  pager.hidden = true;
  try {
    render(await getAdminReports({ status: filterForm.status.value, page, pageSize: PAGE_SIZE }));
  } catch (err) {
    showError(listEl, err, load);
  }
}

function statusBadge(status) {
  const badge = el('span', STATUS_LABELS[status] ?? status, 'badge');
  badge.dataset.state = status;
  return badge;
}

function render(data) {
  alertBox.innerHTML = '';
  if (!data.items.length) {
    pager.hidden = true;
    showEmpty(listEl, filterForm.status.value === 'open'
      ? { title: 'Không còn báo cáo mở', hint: 'Mọi báo cáo đã được xử lý.' }
      : { title: 'Chưa có báo cáo', hint: 'Báo cáo người dùng gửi sẽ hiện ở đây.' });
    return;
  }
  listEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = '<thead><tr><th>Người gửi</th><th>Ước tính</th><th>Giá kỳ vọng</th><th>Nội dung</th><th>Trạng thái</th><th>Ngày gửi</th><th>Hành động</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const r of data.items) {
    const tr = document.createElement('tr');
    const td = text => { const c = document.createElement('td'); c.textContent = text; return c; };
    tr.append(td(r.reporter_email || `#${r.owner_id}`));
    tr.append(td(money(r.estimated_price)));
    tr.append(td(money(r.expected_price)));
    const comment = document.createElement('td');
    comment.textContent = r.comment.length > 60 ? r.comment.slice(0, 60) + '…' : r.comment;
    tr.append(comment);
    const state = document.createElement('td');
    state.append(statusBadge(r.status));
    tr.append(state);
    tr.append(td(r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'));
    const act = document.createElement('td');
    const btn = el('button', 'Xem chi tiết', 'btn');
    btn.type = 'button';
    btn.onclick = () => openDetail(r);
    act.append(btn);
    tr.append(act);
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  listEl.append(wrap);

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  pageInfo.textContent = `Trang ${data.page} / ${pages} · ${data.total} báo cáo`;
  prevBtn.disabled = data.page <= 1;
  nextBtn.disabled = data.page >= pages;
  pager.hidden = false;
}

function factsBlock(rows) {
  const dl = document.createElement('dl');
  dl.className = 'facts';
  for (const [label, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value ?? '—';
    dl.append(dt, dd);
  }
  return dl;
}

function openDetail(r) {
  alertBox.innerHTML = '';
  detailEl.innerHTML = '';
  detailEl.append(factsBlock([
    ['Người gửi', `${r.reporter_name || ''} ${r.reporter_email || ''}`.trim() || `#${r.owner_id}`],
    ['Giá HomeVal ước tính', currency.format(r.estimated_price)],
    ['Giá người dùng kỳ vọng', currency.format(r.expected_price)],
    ['Mã dự đoán', r.prediction_id ?? '—'],
    ['Ngày gửi', r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'],
  ]));
  detailEl.append(el('p', r.comment));

  const snapshot = r.property_snapshot ?? {};
  if (snapshot.area_m2 != null) {
    detailEl.append(el('h4', 'Thông tin căn nhà lúc dự đoán'));
    detailEl.append(factsBlock(propertyFacts(snapshot)));
  }

  if (r.status === 'closed') {
    detailEl.append(el('h4', 'Kết quả xử lý'));
    detailEl.append(factsBlock([
      ['Ghi chú admin', r.admin_note || '—'],
      ['Đóng lúc', r.closed_at ? new Date(r.closed_at).toLocaleString('vi-VN') : '—'],
    ]));
  }
  dialog.showModal();
}

document.getElementById('cancel-close').onclick = () => dialog.close();
filterForm.status.addEventListener('change', () => { page = 1; load(); });
prevBtn.onclick = () => { if (page > 1) { page -= 1; load(); } };
nextBtn.onclick = () => { page += 1; load(); };

load();
}
initPage();
