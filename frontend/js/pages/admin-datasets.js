import { requireAdmin } from '../auth.js';
import { listDatasets, uploadDatasetPreview, uploadDataset, listDatasetUploads } from '../api.js';
import { showEmpty, showError, setFieldError, clearFieldErrors, toast } from '../ui.js';
import { el } from '../model-catalog.js';

const MAX_BYTES = 20 * 1024 * 1024;

function initPage() {
if (!requireAdmin()) return;

const currentEl = document.getElementById('current');
const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file');
const previewEl = document.getElementById('preview');
const historyEl = document.getElementById('history');
let lastFile = null;

async function loadHistory() {
  historyEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  try {
    const { items, total } = await listDatasetUploads();
    if (!total) {
      showEmpty(historyEl, { title: 'Chưa lưu file nào', hint: 'File CSV hợp lệ được lưu ở đây để truy vết.' });
      return;
    }
    historyEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = '<thead><tr><th>File</th><th>Dòng</th><th>Dung lượng</th><th>Cột thiếu</th><th>Người tải</th><th>Ngày tải</th></tr></thead>';
    const tb = document.createElement('tbody');
    for (const h of items) {
      const tr = document.createElement('tr');
      const td = text => { const c = document.createElement('td'); c.textContent = text; return c; };
      tr.append(td(h.filename));
      tr.append(td(Number(h.rows ?? 0).toLocaleString('vi-VN')));
      tr.append(td(`${(Number(h.size_bytes ?? 0) / 1024).toFixed(1)} KB`));
      const miss = document.createElement('td');
      if (h.missing_columns?.length) {
        const b = document.createElement('span');
        b.className = 'badge'; b.dataset.variant = 'warning';
        b.textContent = `Thiếu: ${h.missing_columns.join(', ')}`;
        miss.append(b);
      } else {
        const b = document.createElement('span');
        b.className = 'badge'; b.dataset.variant = 'success';
        b.textContent = 'Đủ cột';
        miss.append(b);
      }
      tr.append(miss);
      tr.append(td(h.uploader_email || '—'));
      tr.append(td(h.created_at ? new Date(h.created_at).toLocaleDateString('vi-VN') : '—'));
      tb.append(tr);
    }
    table.append(tb);
    wrap.append(table);
    historyEl.append(wrap);
  } catch (err) {
    showError(historyEl, err, loadHistory);
  }
}

async function loadCurrent() {
  currentEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  try {
    const { items } = await listDatasets();
    if (!items.length) {
      showEmpty(currentEl, { title: 'Chưa có dataset', hint: 'Chạy scripts/download_dataset.py rồi huấn luyện mô hình.' });
      return;
    }
    currentEl.innerHTML = '';
    for (const d of items) {
      const card = el('article', null, 'model-card');
      card.append(el('h3', d.name ?? d.id ?? 'Dataset'));
      const facts = [
        ['Nguồn', d.source ?? '—'],
        ['Bản ghi nguồn', (d.original_rows ?? 0).toLocaleString('vi-VN')],
        ['Sau làm sạch', (d.cleaned_rows ?? 0).toLocaleString('vi-VN')],
        ['Huấn luyện / hiệu chỉnh / kiểm tra', `${d.train_rows ?? '—'} / ${d.calibration_rows ?? '—'} / ${d.test_rows ?? '—'}`],
        ['Đơn vị giá', d.price_unit ?? '—'],
      ];
      const dl = document.createElement('dl');
      dl.className = 'facts';
      for (const [label, value] of facts) {
        const dt = document.createElement('dt'); dt.textContent = label;
        const dd = document.createElement('dd'); dd.textContent = String(value);
        dl.append(dt, dd);
      }
      card.append(dl);
      if (d.sha256) card.append(el('p', `SHA-256: ${String(d.sha256).slice(0, 16)}…`, 'field__hint'));
      currentEl.append(card);
    }
  } catch (err) {
    showError(currentEl, err, loadCurrent);
  }
}

function renderPreview(result) {
  previewEl.innerHTML = '';
  const head = el('h3', `Xem trước: ${result.filename}`);
  previewEl.append(head);
  previewEl.append(el('p',
    `${result.rows.toLocaleString('vi-VN')} dòng · ${(result.size_bytes / 1024).toFixed(1)} KB`, 'field__hint'));
  if (result.missing_columns?.length) {
    const warn = el('p', '', 'alert alert--error');
    warn.textContent = `Thiếu cột bắt buộc: ${result.missing_columns.join(', ')}. ` +
      `Cột bắt buộc: ${result.required_columns.join(', ')}.`;
    previewEl.append(warn);
  } else {
    const ok = el('p', 'Đủ các cột bắt buộc. File hợp lệ để đưa vào quy trình huấn luyện.', 'alert alert--info');
    previewEl.append(ok);
    if (!lastFile) return;
    const saveBtn = el('button', 'Lưu file này vào kho dữ liệu', 'btn btn--primary');
    saveBtn.type = 'button';
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        const record = await uploadDataset(lastFile);
        toast(`Đã lưu ${record.filename} (${record.rows.toLocaleString('vi-VN')} dòng)`, 'success');
        loadHistory();
      } catch (err) {
        previewEl.append(el('p', err.detail ?? 'Không lưu được file.', 'alert alert--error'));
        saveBtn.disabled = false;
      }
    };
    previewEl.append(saveBtn);
  }
  if (!result.preview?.length) {
    previewEl.append(el('p', 'File không có dòng dữ liệu nào để xem trước.', 'field__hint'));
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const col of Object.keys(result.preview[0])) {
    const th = document.createElement('th');
    th.textContent = col;
    if (result.missing_columns?.includes(col)) th.dataset.missing = 'true';
    hr.append(th);
  }
  thead.append(hr);
  table.append(thead);
  const tb = document.createElement('tbody');
  for (const row of result.preview) {
    const tr = document.createElement('tr');
    for (const col of Object.keys(result.preview[0])) {
      const td = document.createElement('td');
      td.textContent = row[col] ?? '';
      tr.append(td);
    }
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  previewEl.append(wrap);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(form);
  const file = fileInput.files[0];
  if (!file) { setFieldError(fileInput, 'Hãy chọn một file CSV.'); return; }
  if (!/\.csv$/i.test(file.name)) { setFieldError(fileInput, 'Chỉ chấp nhận file .csv'); return; }
  if (file.size > MAX_BYTES) { setFieldError(fileInput, 'File vượt quá 20 MB.'); return; }
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  previewEl.innerHTML = '<p class="field__hint">Đang kiểm tra file…</p>';
  lastFile = file;
  try {
    renderPreview(await uploadDatasetPreview(file));
  } catch (err) {
    previewEl.innerHTML = '';
    const box = el('p', err.detail ?? 'Không kiểm tra được file.', 'alert alert--error');
    previewEl.append(box);
  } finally {
    btn.disabled = false;
  }
});

loadCurrent();
loadHistory();
}
initPage();
