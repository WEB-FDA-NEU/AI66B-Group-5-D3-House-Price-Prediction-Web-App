import { requireAdmin } from '../auth.js';
import { listUsers, deactivateUser, reactivateUser } from '../api.js';
import { showEmpty, showError, confirmAction, toast } from '../ui.js';

const PAGE_SIZE = 10;

function initPage() {
if (!requireAdmin()) return;

const form = document.getElementById('search-form');
const listEl = document.getElementById('list');
const alertBox = document.getElementById('alert');
const pager = document.getElementById('pager');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let page = 1;

const filters = () => ({
  q: form.q.value.trim(),
  role: form.role.value,
  status: form.status.value,
  sort: form.sort.value,
  order: form.sort.value === 'name' ? 'asc' : 'desc',
});

async function load() {
  listEl.innerHTML = '<p class="field__hint">Đang tải…</p>';
  pager.hidden = true;
  try {
    const data = await listUsers({ ...filters(), page, pageSize: PAGE_SIZE });
    render(data);
  } catch (err) {
    showError(listEl, err, load);
  }
}

function render(data) {
  alertBox.innerHTML = '';
  if (!data.items.length) {
    pager.hidden = true;
    showEmpty(listEl, { title: 'Không tìm thấy tài khoản', hint: 'Thử nới lỏng từ khoá hoặc bộ lọc.' });
    return;
  }
  listEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = '<thead><tr><th>Tên hiển thị</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Dự đoán đã lưu</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>';
  const tb = document.createElement('tbody');
  for (const u of data.items) {
    const status = u.status ?? 'Active';
    const tr = document.createElement('tr');
    const td = text => { const c = document.createElement('td'); c.textContent = text; return c; };
    tr.append(td(u.display_name), td(u.email));
    const role = document.createElement('td');
    const roleBadge = document.createElement('span');
    roleBadge.className = 'badge';
    roleBadge.dataset.variant = u.role === 'admin' ? 'danger' : 'info';
    roleBadge.textContent = u.role === 'admin' ? 'Quản trị' : 'Người dùng';
    role.append(roleBadge);
    tr.append(role);
    const state = document.createElement('td');
    const stateBadge = document.createElement('span');
    stateBadge.className = 'badge';
    stateBadge.dataset.state = status;
    stateBadge.textContent = status === 'Active' ? 'Đang hoạt động' : 'Đã vô hiệu hoá';
    state.append(stateBadge);
    tr.append(state);
    tr.append(td(Number(u.prediction_count ?? 0).toLocaleString('vi-VN')));
    tr.append(td(u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'));
    const act = document.createElement('td');
    if (status === 'Active') {
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.textContent = 'Vô hiệu hoá';
      btn.onclick = () => onDeactivate(u);
      act.append(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.textContent = 'Mở khoá';
      btn.onclick = () => onReactivate(u);
      act.append(btn);
    }
    tr.append(act);
    tb.append(tr);
  }
  table.append(tb);
  wrap.append(table);
  listEl.append(wrap);

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  pageInfo.textContent = `Trang ${data.page} / ${pages} · ${data.total} tài khoản`;
  prevBtn.disabled = data.page <= 1;
  nextBtn.disabled = data.page >= pages;
  pager.hidden = false;
}

async function onDeactivate(u) {
  const ok = await confirmAction({
    title: `Vô hiệu hoá ${u.email}?`,
    message: 'Tài khoản bị chặn đăng nhập ngay lập tức. Lịch sử dự đoán đã lưu được giữ lại.',
    confirmText: 'Vô hiệu hoá',
  });
  if (!ok) return;
  try {
    await deactivateUser(u.id);
    toast(`Đã vô hiệu hoá ${u.email}`, 'success');
    load();
  } catch (err) {
    alertBox.innerHTML = `<p class="alert alert--error">${err.detail ?? 'Vô hiệu hoá thất bại.'}</p>`;
  }
}

async function onReactivate(u) {
  const ok = await confirmAction({
    title: `Mở khoá ${u.email}?`,
    message: 'Tài khoản được đăng nhập trở lại.',
    confirmText: 'Mở khoá',
  });
  if (!ok) return;
  try {
    await reactivateUser(u.id);
    toast(`Đã mở khoá ${u.email}`, 'success');
    load();
  } catch (err) {
    alertBox.innerHTML = `<p class="alert alert--error">${err.detail ?? 'Mở khoá thất bại.'}</p>`;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  page = 1;
  load();
});
form.role.addEventListener('change', () => { page = 1; load(); });
form.status.addEventListener('change', () => { page = 1; load(); });
form.sort.addEventListener('change', () => { page = 1; load(); });
prevBtn.onclick = () => { if (page > 1) { page -= 1; load(); } };
nextBtn.onclick = () => { page += 1; load(); };

load();
}
initPage();
