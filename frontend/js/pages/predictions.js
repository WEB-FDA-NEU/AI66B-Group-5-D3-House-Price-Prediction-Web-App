import { deletePrediction, getPredictionHistory } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { confirmAction, showEmpty, showError, toast } from '../ui.js';
import { intervalText, predictionDisclaimer } from '../prediction-summary.js';
import { exportPredictions, today } from '../csv.js';
import { MAX_COMPARE, compareUrl, readSelection, writeSelection } from '../compare-selection.js';

if (!isLoggedIn()) requireLogin();

const form = document.getElementById('history-search');
const list = document.getElementById('history-list');
const compareBar = document.getElementById('compare-bar');
const compareStatus = document.getElementById('compare-status');
const compareGo = document.getElementById('compare-go');
const exportButton = document.getElementById('export-history');
let selection = readSelection();
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
  const interval = document.createElement('p');
  interval.className = 'field__hint';
  interval.textContent = intervalText(item);
  const disclaimer = document.createElement('p');
  disclaimer.className = 'field__hint';
  disclaimer.textContent = item.disclaimer || predictionDisclaimer;
  meta.append(title, details, model, interval, disclaimer);

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
  const pick = document.createElement('label');
  pick.className = 'compare-pick';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.value = item.id;
  box.checked = selection.includes(String(item.id));
  box.addEventListener('change', () => toggleCompare(String(item.id), box.checked));
  pick.append(box, document.createTextNode(' So sánh'));
  actions.append(pick, view, remove);
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
    syncCompare();
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
    toggleCompare(String(item.id), false);
    toast('Đã xóa dự đoán.');
    load();
  } catch (error) {
    toast(error.detail ?? 'Không thể xóa dự đoán.', 'error');
  }
}

// US-7 (#36): choose 2-3 saved estimates, then open compare.html?ids=…
function toggleCompare(id, checked) {
  selection = checked ? [...new Set([...selection, id])].slice(0, MAX_COMPARE) : selection.filter(x => x !== id);
  writeSelection(selection);
  syncCompare();
}

function syncCompare() {
  const full = selection.length >= MAX_COMPARE;
  for (const box of list.querySelectorAll('.compare-pick input')) {
    box.checked = selection.includes(box.value);
    box.disabled = full && !box.checked;
    box.closest('.compare-pick').title = box.disabled ? `Chỉ so sánh tối đa ${MAX_COMPARE} dự đoán.` : '';
  }
  compareBar.hidden = selection.length === 0;
  compareStatus.textContent = selection.length < 2
    ? `Đã chọn ${selection.length}/${MAX_COMPARE}. Chọn thêm ít nhất ${2 - selection.length} dự đoán để so sánh.`
    : `Đã chọn ${selection.length}/${MAX_COMPARE} dự đoán.`;
  compareGo.href = compareUrl(selection);
  compareGo.toggleAttribute('aria-disabled', selection.length < 2);
  compareGo.classList.toggle('is-disabled', selection.length < 2);
}

compareGo.addEventListener('click', event => {
  if (selection.length < 2) { event.preventDefault(); toast('Hãy chọn ít nhất 2 dự đoán để so sánh.', 'error'); }
});
document.getElementById('compare-clear').addEventListener('click', () => {
  selection = [];
  writeSelection(selection);
  syncCompare();
});

// US-8 (#49): export the whole history (every page, ignoring the search box).
exportButton.addEventListener('click', async () => {
  exportButton.disabled = true;
  exportButton.textContent = 'Đang xuất…';
  try {
    const items = [];
    for (let page = 1; ; page += 1) {
      const data = await getPredictionHistory({ page, pageSize: 100 });
      items.push(...data.items);
      if (!data.items.length || items.length >= (data.total ?? items.length)) break;
    }
    if (!items.length) { toast('Chưa có dự đoán đã lưu để xuất.', 'error'); return; }
    exportPredictions(items, `homeval-lich-su-du-doan-${today()}.csv`);
    toast(`Đã xuất ${items.length} dự đoán ra CSV.`);
  } catch (error) {
    toast(error.detail ?? 'Không thể xuất CSV.', 'error');
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = 'Xuất CSV';
  }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  load();
});

if (isLoggedIn()) load();
