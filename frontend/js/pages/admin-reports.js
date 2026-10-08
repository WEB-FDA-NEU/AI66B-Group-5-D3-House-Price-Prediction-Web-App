import { requireAdmin } from '../auth.js';
import { getReports, closeReport } from '../api.js';
import { showEmpty, showError, setFieldError, clearFieldErrors, toast } from '../ui.js';
import { el, money } from '../model-catalog.js';

const PAGE_SIZE = 10;

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
const closeForm = document.getElementById('close-form');
const noteInput = document.getElementById('note');
let page = 1;
let current = null;

async function load() {
  listEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  pager.hidden = true;
  try {
    const data = await getReports({ status: filterForm.status.value, page, pageSize: PAGE_SIZE });
    render(data);
  } catch (err) {
    showError(listEl, err, load);
  }
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
  table.innerHTML = '<thead><tr><th>Người gửi</th><th>Giá kỳ vọng</th><th>Nội dung</th><th>Trạng thái</th><th>Ngày gửi</th><th>Hành động</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const r of data.items) {
    const tr = document.createElement('tr');
    const td = text => { const c = document.createElement('td'); c.textContent = text; return c; };
    tr.append(td(r.reporter_email || `#${r.owner_id}`));
    tr.append(td(money(r.expected_price)));
    const comment = document.createElement('td');
    comment.textContent = r.comment.length > 60 ? r.comment.slice(0, 60) + '…' : r.comment;
    tr.append(comment);
    const state = document.createElement('td');
    const b = document.createElement('span');
    b.className = 'badge';
    b.dataset.state = r.status;
    b.textContent = r.status === 'open' ? 'Đang mở' : 'Đã đóng';
    state.append(b);
    tr.append(state);
    tr.append(td(r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'));
    const act = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = r.status === 'open' ? 'Xem & đóng' : 'Xem chi tiết';
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

function openDetail(r) {
  current = r;
  alertBox.innerHTML = '';
  clearFieldErrors(closeForm);
  closeForm.reset();
  detailEl.innerHTML = '';
  const facts = [
    ['Người gửi', `${r.reporter_name || ''} ${r.reporter_email || ''}`.trim() || `#${r.owner_id}`],
    ['Giá kỳ vọng', money(r.expected_price)],
    ['Mã dự đoán', r.prediction_id ?? '—'],
    ['Ngày gửi', r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'],
  ];
  const dl = document.createElement('dl');
  dl.className = 'facts';
  for (const [label, value] of facts) {
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    dl.append(dt, dd);
  }
  detailEl.append(dl);
  detailEl.append(el('p', r.comment));
  if (r.status === 'closed') {
    detailEl.append(el('p', `Ghi chú admin: ${r.admin_note || '—'}`, 'field__hint'));
    closeForm.hidden = true;
  } else {
    closeForm.hidden = false;
    closeForm.querySelector('button[type=submit]').disabled = false;
  }
  dialog.showModal();
}

closeForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(closeForm);
  const note = noteInput.value.trim();
  if (!note) { setFieldError(noteInput, 'Ghi chú không được để trống.'); return; }
  const btn = closeForm.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    await closeReport(current.id, note);
    dialog.close();
    toast('Đã đóng báo cáo.', 'success');
    load();
  } catch (err) {
    setFieldError(noteInput, err.detail ?? 'Đóng báo cáo thất bại.');
    btn.disabled = false;
  }
});

document.getElementById('cancel-close').onclick = () => dialog.close();
filterForm.status.addEventListener('change', () => { page = 1; load(); });
prevBtn.onclick = () => { if (page > 1) { page -= 1; load(); } };
nextBtn.onclick = () => { page += 1; load(); };

load();
}
initPage();
