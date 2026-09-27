import { deletePrediction, getPrediction, ApiError } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { confirmAction, toast } from '../ui.js';
import { intervalText, predictionDisclaimer } from '../prediction-summary.js';
import '../components/site-header.js';
import '../components/site-footer.js';

if (!isLoggedIn()) requireLogin();

const id = new URLSearchParams(location.search).get('id');
const detail = document.getElementById('detail');
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
    const title = prediction.label || `${prediction.property_type} tại ${prediction.district}`;
    document.title = `${title} - HomeVal`;
    document.getElementById('title').textContent = title;
    document.getElementById('estimated-price').textContent = price.format(prediction.estimated_price);
    document.getElementById('model-version').textContent = `Model ${prediction.model_version}`;
    document.getElementById('confidence-interval').textContent = intervalText(prediction);
    document.getElementById('prediction-disclaimer').textContent = prediction.disclaimer || predictionDisclaimer;
    const input = prediction.input ?? prediction;
    const facts = document.getElementById('input-summary');
    addFact(facts, 'Quận/huyện', prediction.district);
    addFact(facts, 'Loại hình', prediction.property_type);
    addFact(facts, 'Diện tích', `${prediction.area_m2} m²`);
    if (input.bedrooms != null) addFact(facts, 'Phòng ngủ', input.bedrooms);
    if (input.bathrooms != null) addFact(facts, 'Phòng tắm', input.bathrooms);
    if (input.floors != null) addFact(facts, 'Số tầng', input.floors);
    detail.hidden = false;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) location.href = '404.html';
    else toast(error.detail ?? 'Không thể tải dự đoán.', 'error');
  }
}

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
