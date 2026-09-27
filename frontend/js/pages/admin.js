import { requireAdmin } from '../auth.js';
import { getAdminStats, ApiError } from '../api.js';
import { showEmpty, showError, showSkeleton } from '../ui.js';

if (!requireAdmin()) throw new Error('blocked');

const kpis = document.getElementById('kpis');
const chart = document.getElementById('chart');
const activity = document.getElementById('activity');
const alertBox = document.getElementById('alert');

showSkeleton(kpis, 4);

try {
  const s = await getAdminStats();
  const fmt = n => n.toLocaleString('vi-VN');
  kpis.innerHTML = '';
  const cards = [
    ['Người dùng', fmt(s.users_total), 'tổng tài khoản'],
    ['Dự báo hôm nay', fmt(s.predictions_today), `${fmt(s.predictions_week)} / tuần`],
    ['Model đang live', s.active_model.version, `${s.active_model.algorithm} · R² ${s.active_model.r2}`],
    ['Lỗi API 24h', fmt(s.api_errors_24h), 'xem /docs khi có backend'],
  ];
  for (const [label, value, sub] of cards) {
    const d = document.createElement('div');
    d.className = 'kpi';
    const l = document.createElement('p'); l.className = 'kpi__label'; l.textContent = label;
    const v = document.createElement('p'); v.className = 'kpi__value'; v.textContent = value;
    const t = document.createElement('p'); t.className = 'kpi__sub'; t.textContent = sub;
    d.append(l, v, t);
    kpis.append(d);
  }
  const max = Math.max(...s.predictions_per_day.map(x => x.count));
  chart.innerHTML = '';
  for (const p of s.predictions_per_day) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:.5rem;margin:.25rem 0';
    const lab = document.createElement('span');
    lab.style.minWidth = '3rem'; lab.textContent = p.date;
    const bar = document.createElement('div');
    bar.style.cssText = `height:1rem;background:var(--c-primary);border-radius:4px;width:${(p.count / max * 100).toFixed(1)}%`;
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', `${p.date}: ${p.count} dự báo`);
    const num = document.createElement('span'); num.textContent = p.count;
    row.append(lab, bar, num);
    chart.append(row);
  }
  activity.innerHTML = '';
  if (!s.recent_activity.length) {
    showEmpty(activity, { title: 'Chưa có hoạt động', hint: 'Upload model đầu tiên để thấy ở đây.', actionText: 'Upload model', actionHref: 'admin-models-new.html' });
  } else {
    for (const a of s.recent_activity) {
      const li = document.createElement('li');
      li.textContent = a.text + ' ';
      const t = document.createElement('time');
      t.dateTime = a.created_at;
      t.textContent = new Date(a.created_at).toLocaleString('vi-VN');
      li.append(t);
      activity.append(li);
    }
  }
} catch (err) {
  const msg = err instanceof ApiError ? err.detail : 'Không tải được dashboard.';
  alertBox.innerHTML = `<p class="alert alert--error">${msg} <a href="500.html">Chi tiết lỗi</a></p>`;
  showError(kpis, err, () => location.reload());
}
