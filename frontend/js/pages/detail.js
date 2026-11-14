import { deletePrediction, getPrediction, ApiError } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { confirmAction, toast } from '../ui.js';
import { intervalText, predictionDisclaimer } from '../prediction-summary.js';
import { propertyFacts } from '../property.js';
import { renderExplanation } from '../components/estimate-explanation.js';
import { exportPredictions } from '../csv.js';
import '../components/site-header.js';
import '../components/site-footer.js';

if (!isLoggedIn()) requireLogin();

const id = new URLSearchParams(location.search).get('id');
const detail = document.getElementById('detail');
let loaded = null;
const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

function addFact(container, label, value) {
  const term = document.createElement('dt');
  const definition = document.createElement('dd');
  term.textContent = label;
  definition.textContent = value ?? 'Chưa có';
  container.append(term, definition);
}

async function load() {
  if (!id) { location.href = '404.html'; return; }
  try {
    const prediction = await getPrediction(id);
    loaded = prediction;
    const title = prediction.label || `${prediction.property_type} tại ${prediction.district}`;
    document.title = `${title} - HomeVal`;
    document.getElementById('title').textContent = title;
    document.getElementById('estimated-price').textContent = price.format(prediction.estimated_price);
    document.getElementById('model-version').textContent = `Model ${prediction.model_version}`;
    document.getElementById('confidence-interval').textContent = intervalText(prediction);
    document.getElementById('prediction-disclaimer').textContent = prediction.disclaimer || predictionDisclaimer;
    const input = prediction.input ?? prediction;
    const facts = document.getElementById('input-summary');
    for (const [label, value] of propertyFacts(input)) addFact(facts, label, value);
    document.getElementById('explanation-slot').replaceChildren(renderExplanation(prediction));
    detail.hidden = false;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) { location.href = '404.html'; return; }
    if (error instanceof ApiError && error.status === 401) { requireLogin(); return; }
    showLoadError(error);
  }
}

// FE-09 (#8): a failed load must leave a visible way forward, not a blank page
// with a toast that disappears after three seconds.
function showLoadError(error) {
  let box = document.getElementById('detail-error');
  if (!box) {
    box = document.createElement('section');
    box.id = 'detail-error';
    box.className = 'empty';
    box.setAttribute('role', 'alert');
    detail.before(box);
  }
  const title = document.createElement('p');
  title.className = 'empty__title';
  title.textContent = 'Không tải được dự đoán';
  const hint = document.createElement('p');
  hint.className = 'empty__hint';
  hint.textContent = error?.detail ?? 'Kiểm tra kết nối mạng rồi thử lại.';
  const actions = document.createElement('div');
  actions.className = 'row__actions';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn btn--primary';
  retry.textContent = 'Thử lại';
  retry.addEventListener('click', () => { box.remove(); load(); });
  const back = document.createElement('a');
  back.className = 'btn';
  back.href = 'predictions.html';
  back.textContent = 'Quay lại lịch sử';
  actions.append(retry, back);
  box.replaceChildren(title, hint, actions);
}

// US-8 (#49): export this one prediction.
document.getElementById('export-prediction').addEventListener('click', () => {
  if (!loaded) return;
  exportPredictions([loaded], `homeval-du-doan-${String(loaded.id).replace(/[^\w-]/g, '')}.csv`);
  toast('Đã xuất dự đoán ra CSV.');
});

document.getElementById('delete-prediction').addEventListener('click', async () => {
  const approved = await confirmAction({
    title: 'Xóa dự đoán đã lưu?',
    message: 'Dự đoán sẽ bị xóa khỏi lịch sử tài khoản của bạn.',
    confirmText: 'Xóa dự đoán',
  });
  if (!approved) return;
  try {
    await deletePrediction(id);
    toast('Đã xóa dự đoán.');
    location.href = 'predictions.html';
  } catch (error) {
    toast(error.detail ?? 'Không thể xóa dự đoán.', 'error');
  }
});

if (isLoggedIn()) load();
