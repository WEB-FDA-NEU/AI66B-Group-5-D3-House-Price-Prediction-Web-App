import { savePrediction } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { toast } from '../ui.js';

const draft = JSON.parse(sessionStorage.getItem('homeval_prediction_draft') || 'null');
const result = document.getElementById('result');
const saveForm = document.getElementById('save-form');
const historyLink = document.getElementById('history-link');

if (!draft) {
  location.href = 'predict.html';
} else {
  const loggedIn = isLoggedIn();
  if (!loggedIn) requireLogin();

  const formatPrice = value => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: draft.currency ?? 'VND', maximumFractionDigits: 0,
  }).format(value);
  document.getElementById('estimated-price').textContent = formatPrice(draft.estimated_price);
  document.getElementById('confidence-interval').textContent =
    `Khoảng ước tính: ${formatPrice(draft.confidence_interval.lower)} - ${formatPrice(draft.confidence_interval.upper)}`;
  document.getElementById('model-version').textContent =
    `Model ${draft.model.version} - ${draft.model.algorithm}`;

  const fields = [
    ['Quận/huyện', draft.input.district],
    ['Loại hình', draft.input.property_type],
    ['Diện tích', `${draft.input.area_m2} m²`],
    ['Phòng ngủ', draft.input.bedrooms],
    ['Phòng tắm', draft.input.bathrooms],
    ['Số tầng', draft.input.floors],
  ];
  const summary = document.getElementById('input-summary');
  for (const [label, value] of fields) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value ?? 'Chưa có';
    summary.append(term, detail);
  }

  if (loggedIn) {
    saveForm.hidden = false;
    historyLink.hidden = false;
  }
  result.hidden = !loggedIn;
}

saveForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isLoggedIn()) {
    requireLogin();
    return;
  }
  const button = saveForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await savePrediction(draft, saveForm.label.value);
    saveForm.hidden = true;
    historyLink.hidden = false;
    toast('Đã lưu dự đoán vào lịch sử.');
  } catch (error) {
    toast(error.detail ?? 'Không thể lưu dự đoán.', 'error');
    button.disabled = false;
  }
});
