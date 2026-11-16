import { deletePrediction, getPredictionHistory } from '../api.js';
import { isLoggedIn, requireLogin, expireSession } from '../auth.js';
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
const pagination = document.getElementById('history-pagination');
const previousPage = document.getElementById('history-previous');
const nextPage = document.getElementById('history-next');
const pageStatus = document.getElementById('history-page-status');
let selection = readSelection();
let currentPage = 1;
const pageSize = 10;
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
  pagination.hidden = true;
  try {
    const data = await getPredictionHistory({
      q: form.q.value.trim(),
      propertyType: form.property_type.value,
      district: form.district.value.trim(),
      minPrice: form.min_price.value,
      maxPrice: form.max_price.value,
      sort: form.sort.value,
      page: currentPage,
      pageSize,
    });
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize));
    if (currentPage > lastPage) {
      currentPage = lastPage;
      await load();
      return;
    }
    if (!data.items.length) {
      showEmpty(list, {
        title: data.total ? 'Không có kết quả ở trang này' : 'Chưa có dự đoán phù hợp',
        hint: data.total ? 'Hãy quay lại trang trước.' : 'Thử thay đổi bộ lọc hoặc tạo một dự đoán mới.',
        actionText: data.total ? '' : 'Dự đoán giá nhà',
        actionHref: 'predict.html',
      });
      if (data.total) renderPagination(data.total);
      return;
    }
    list.replaceChildren(...data.items.map(createRow));
    syncCompare();
    renderPagination(data.total);
  } catch (error) {
    if (error.status === 401) {
      expireSession();
      requireLogin();
      return;
    }
    showError(list, error, load);
  }
}

function renderPagination(total) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  pagination.hidden = pageCount <= 1;
  pageStatus.textContent = `Trang ${currentPage}/${pageCount} · ${total} kết quả`;
  previousPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= pageCount;
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
  const min = form.min_price.value;
  const max = form.max_price.value;
  if (min && max && Number(min) > Number(max)) {
    form.max_price.setCustomValidity('Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.');
    form.max_price.reportValidity();
    form.max_price.setCustomValidity('');
    return;
  }
  currentPage = 1;
  load();
});

previousPage.addEventListener('click', () => {
  if (currentPage > 1) { currentPage -= 1; load(); }
});
nextPage.addEventListener('click', () => {
  currentPage += 1;
  load();
});

if (isLoggedIn()) load();
