import { deletePrediction, getPredictionHistory } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { confirmAction, showEmpty, showError, toast } from '../ui.js';

if (!isLoggedIn()) requireLogin();

const form = document.getElementById('history-search');
const list = document.getElementById('history-list');
const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function createRow(item) {
  const article = document.createElement('article');
  article.className = 'prediction-row';
  const meta = document.createElement('div');
  const title = document.createElement('h2');
  const details = document.createElement('p');
  const model = document.createElement('p');
  title.textContent = item.label || `${item.property_type} tại ${item.district}`;
  details.className = 'prediction-row__meta';
  details.textContent = `${item.property_type} · ${item.district} · ${item.area_m2} m² · ${formatDate(item.created_at)}`;
  model.className = 'field__hint';
  model.textContent = `Model ${item.model_version}`;
  meta.append(title, details, model);

  const value = document.createElement('strong');
  value.className = 'prediction-row__price';
  value.textContent = price.format(item.estimated_price);

  const actions = document.createElement('div');
  actions.className = 'row__actions';
  const view = document.createElement('a');
  view.className = 'btn';
  view.href = `detail.html?id=${encodeURIComponent(item.id)}`;
  view.textContent = 'Chi tiết';
  const remove = document.createElement('button');
  remove.className = 'btn btn--danger';
  remove.type = 'button';
  remove.textContent = 'Xóa';
  remove.addEventListener('click', () => removeItem(item));
  actions.append(view, remove);
  article.append(meta, value, actions);
  return article;
}

async function load() {
  list.textContent = 'Đang tải lịch sử...';
  try {
    const data = await getPredictionHistory({ q: form.q.value, pageSize: 50 });
    if (!data.items.length) {
      showEmpty(list, {
        title: 'Chưa có dự đoán đã lưu',
        hint: 'Hãy tạo một dự đoán rồi lưu lại để xem ở đây.',
        actionText: 'Dự đoán giá nhà',
        actionHref: 'predict.html',
      });
      return;
    }
    list.replaceChildren(...data.items.map(createRow));
  } catch (error) {
    showError(list, error, load);
  }
}

async function removeItem(item) {
  const approved = await confirmAction({
    title: 'Xóa dự đoán đã lưu?',
    message: `Dự đoán "${item.label || `${item.property_type} tại ${item.district}`}" sẽ không còn xuất hiện trong lịch sử của bạn.`,
    confirmText: 'Xóa dự đoán',
  });
  if (!approved) return;
  try {
    await deletePrediction(item.id);
    toast('Đã xóa dự đoán.');
    load();
  } catch (error) {
    toast(error.detail ?? 'Không thể xóa dự đoán.', 'error');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  load();
});

load();
