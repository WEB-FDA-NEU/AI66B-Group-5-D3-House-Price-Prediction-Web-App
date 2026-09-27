// ============================================================
//  Trang chủ — ô "Độ chính xác mô hình hiện tại" tự tải dữ liệu.
//  Đây không phải màn hình danh sách nên không dùng showSkeleton/showEmpty
//  (những hàm đó dành cho lưới thẻ), thay vào đó tự vẽ đơn giản:
//  đang tải → có dữ liệu / lỗi.
// ============================================================
import { getModelInfo } from '../api.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const statsBody = document.getElementById('model-stats-body');

function makeStat(label, value) {
  const el = document.createElement('div');
  el.className = 'stat';
  const v = document.createElement('p');
  v.className = 'stat__value';
  v.textContent = value;
  const l = document.createElement('p');
  l.className = 'stat__label';
  l.textContent = label;
  el.appendChild(v);
  el.appendChild(l);
  return el;
}

function renderStats(info) {
  statsBody.textContent = '';
  const grid = document.createElement('div');
  grid.className = 'stat-grid';
  grid.appendChild(makeStat('Phiên bản mô hình', info.model_version));
  grid.appendChild(makeStat('Độ chính xác (R²)', `${Math.round(info.metrics.r2 * 100)}%`));
  grid.appendChild(makeStat('Sai số trung bình', `±${Math.round(info.metrics.mape_percent)}%`));
  statsBody.appendChild(grid);
}

// Không có "empty state" riêng: đây là 1 object (thông tin mô hình),
// không phải danh sách, nên chỉ có 2 nhánh sau khi tải xong: có dữ liệu / lỗi.
function renderStatsError(err) {
  statsBody.textContent = '';
  const msg = document.createElement('p');
  msg.textContent = err && err.detail ? err.detail : 'Không tải được số liệu mô hình.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn';
  retry.textContent = 'Thử lại';
  retry.addEventListener('click', loadModelStats);
  statsBody.appendChild(msg);
  statsBody.appendChild(retry);
}

async function loadModelStats() {
  statsBody.textContent = '';
  const loading = document.createElement('p');
  loading.textContent = 'Đang tải số liệu mô hình…';
  statsBody.appendChild(loading);

  try {
    const info = await getModelInfo();
    renderStats(info);
  } catch (err) {
    renderStatsError(err);
  }
}

loadModelStats();
