// ============================================================
//  Giới thiệu mô hình - tải chi tiết mô hình từ mock/model.json
//  và đổ vào <template id="tpl-model-detail">.
//  Cùng cách làm với home.js: đang tải → có dữ liệu / lỗi, không
//  dùng showSkeleton/showEmpty vì đây không phải danh sách.
// ============================================================
import { getModelInfo } from '../api.js';
import { formatVND } from '../render.js';
import '../components/site-header.js';
import '../components/site-footer.js';

const detail = document.getElementById('model-detail');

function fillField(root, name, value) {
  const el = root.querySelector(`[data-field="${name}"]`);
  if (el) el.textContent = value;
}

function renderDetail(info) {
  const node = document.getElementById('tpl-model-detail').content.cloneNode(true);

  fillField(node, 'dataset-name', info.dataset.name);
  fillField(node, 'dataset-source', info.dataset.source);
  fillField(node, 'dataset-coverage', info.dataset.coverage);
  fillField(node, 'dataset-size', info.dataset.size.toLocaleString('vi-VN'));
  fillField(node, 'dataset-features', info.dataset.features_count);

  fillField(node, 'algorithm', info.algorithm);
  fillField(node, 'model-version', info.model_version);
  fillField(node, 'last-updated', new Date(info.last_updated).toLocaleDateString('vi-VN'));

  fillField(node, 'metric-r2', `${Math.round(info.metrics.r2 * 100)}%`);
  fillField(node, 'metric-mae', formatVND(info.metrics.mae_vnd));
  fillField(node, 'metric-rmse', formatVND(info.metrics.rmse_vnd));
  fillField(node, 'metric-mape', `${info.metrics.mape_percent}%`);

  const list = node.querySelector('[data-field="limitations-list"]');
  info.limitations.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });

  detail.textContent = '';
  detail.appendChild(node);
}

function renderDetailError(err) {
  detail.textContent = '';
  const msg = document.createElement('p');
  msg.textContent = err && err.detail ? err.detail : 'Không tải được chi tiết mô hình.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn';
  retry.textContent = 'Thử lại';
  retry.addEventListener('click', loadDetail);
  detail.appendChild(msg);
  detail.appendChild(retry);
}

async function loadDetail() {
  detail.textContent = '';
  const loading = document.createElement('p');
  loading.textContent = 'Đang tải chi tiết mô hình…';
  detail.appendChild(loading);

  try {
    const info = await getModelInfo();
    renderDetail(info);
  } catch (err) {
    renderDetailError(err);
  }
}

loadDetail();
