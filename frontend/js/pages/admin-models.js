import { requireAdmin } from '../auth.js';
import { listModels } from '../api.js';
import { showEmpty, showError } from '../ui.js';

if (!requireAdmin()) throw new Error('blocked');

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
    showEmpty(listEl, { title: 'Chưa có model nào', hint: 'Upload version đầu tiên để bắt đầu.', actionText: 'Upload model', actionHref: 'admin-models-new.html' });
    return;
  }
  listEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = '<thead><tr><th>Version</th><th>Thuật toán</th><th>Dataset</th><th>MAE</th><th>R²</th><th>Ngày upload</th><th>State</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const m of items) {
    const tr = document.createElement('tr');
    const td = (t) => { const c = document.createElement('td'); c.textContent = t; return c; };
    tr.append(td(m.version), td(m.algorithm), td(m.dataset));
    tr.append(td(m.mae == null ? '—' : Number(m.mae).toLocaleString('vi-VN')));
    tr.append(td(m.r2 == null ? '—' : m.r2));
    tr.append(td(new Date(m.upload_date).toLocaleDateString('vi-VN')));
    const st = document.createElement('td');
    const b = document.createElement('span');
    b.className = 'badge'; b.dataset.state = m.state; b.textContent = m.state;
    st.append(b); tr.append(st);
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  listEl.append(wrap);
}

load();
