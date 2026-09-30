import { requireAdmin } from '../auth.js';
import { listModels, activateModel, archiveModel, ApiError } from '../api.js';
import { showEmpty, showError, confirmAction, toast } from '../ui.js';

function initPage() {
if (!requireAdmin()) return;

const listEl = document.getElementById('list');
const alertBox = document.getElementById('alert');

async function load() {
  listEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  try {
    const data = await listModels();
    render(data.items);
  } catch (err) {
    showError(listEl, err, load);
  }
}

function render(items) {
  alertBox.innerHTML = '';
  if (!items.length) {
    showEmpty(listEl, { title: 'Chưa có model nào', hint: 'Huấn luyện phiên bản đầu tiên để bắt đầu.', actionText: 'Huấn luyện mô hình', actionHref: 'admin-models-new.html' });
    return;
  }
  listEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = '<thead><tr><th>Version</th><th>Thuật toán</th><th>Dataset</th><th>MAE</th><th>R²</th><th>Ngày huấn luyện</th><th>State</th><th>Hành động</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const m of items) {
    const tr = document.createElement('tr');
    const td = (t) => { const c = document.createElement('td'); c.textContent = t; return c; };
    tr.append(td(m.version), td(m.algorithm));
    const datasetCell = document.createElement('td');
    const datasetLink = document.createElement('a'); datasetLink.href = 'admin-models-new.html#dataset-info'; datasetLink.textContent = m.dataset;
    const hash = document.createElement('small'); hash.style.display = 'block'; hash.textContent = 'SHA-256: ' + m.dataset_info.sha256.slice(0, 12) + '…';
    datasetCell.append(datasetLink, hash); tr.append(datasetCell);
    tr.append(td(m.mae == null ? '—' : Number(m.mae).toLocaleString('vi-VN')));
    tr.append(td(m.r2 == null ? '—' : Number(m.r2).toFixed(3)));
    tr.append(td(new Date(m.upload_date).toLocaleDateString('vi-VN')));
    const st = document.createElement('td');
    const b = document.createElement('span');
    b.className = 'badge'; b.dataset.state = m.state; b.textContent = m.state;
    st.append(b); tr.append(st);
    const act = document.createElement('td');
    if (m.state === 'Validated' || m.state === 'Archived') {
      const btn = document.createElement('button');
      btn.className = 'btn btn--primary'; btn.textContent = 'Phát hành';
      btn.onclick = () => onActivate(m);
      act.append(btn);
    } else if (m.state === 'Active') {
      const span = document.createElement('span');
      span.className = 'field__hint'; span.textContent = 'Đang phục vụ';
      act.append(span);
    } else if (m.state === 'Rejected') {
      const span = document.createElement('span');
      span.className = 'field__hint'; span.textContent = 'Không thể activate';
      act.append(span);
    }
    if (m.state === 'Validated' || m.state === 'Active') {
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.textContent = 'Lưu trữ'; btn.style.marginLeft = '.5rem';
      btn.onclick = () => onArchive(m);
      act.append(btn);
    }
    tr.append(act);
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  listEl.append(wrap);
}

async function onActivate(m) {
  const ok = await confirmAction({
    title: `Kích hoạt ${m.version}?`,
    message: `Phiên bản đang phục vụ của cùng thuật toán sẽ được lưu trữ. Các thuật toán khác không thay đổi.`,
    confirmText: 'Kích hoạt',
  });
  if (!ok) return;
  try {
    await activateModel(m.id);
    toast(`Đã kích hoạt ${m.version}`, 'success');
    load();
  } catch (err) {
    // BR-2 conflict: list đã refresh, hiện notice.
    alertBox.innerHTML = `<p class="alert alert--error">${err.detail ?? 'Kích hoạt thất bại.'}</p>`;
    load();
  }
}

async function onArchive(m) {
  const ok = await confirmAction({
    title: `Archive ${m.version}?`,
    message: 'Version sẽ rời danh sách active và chỉ dùng để rollback.',
    confirmText: 'Archive',
  });
  if (!ok) return;
  try {
    await archiveModel(m.id);
    toast(`Đã archive ${m.version}`, 'success');
    load();
  } catch (err) {
    toast(err.detail ?? 'Archive thất bại.', 'error');
  }
}

load();
}
initPage();
