import { predictionDisclaimer } from '../prediction-summary.js';
import { el, money } from '../model-catalog.js';
import { savePrediction, getModels, getEntitlements, createPrediction } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { toast } from '../ui.js';
import { propertyFacts, isLand } from '../property.js';

let draft;
try { draft = JSON.parse(sessionStorage.getItem('homeval_prediction_draft') || 'null'); }
catch { draft = null; }
const result = document.getElementById('result');
const saveForm = document.getElementById('save-form');
const historyLink = document.getElementById('history-link');

if (!draft?.input || !draft?.confidence_interval || !draft?.model) {
  location.href = 'predict.html';
} else {
  const loggedIn = isLoggedIn();

  const formatPrice = value => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: draft.currency ?? 'VND', maximumFractionDigits: 0,
  }).format(value);
  document.getElementById('estimated-price').textContent = formatPrice(draft.estimated_price);
  document.getElementById('confidence-interval').textContent =
    `Khoảng ước tính: ${formatPrice(draft.confidence_interval.lower)} - ${formatPrice(draft.confidence_interval.upper)}`;
  document.getElementById('model-version').textContent =
    `Model ${draft.model.version} - ${draft.model.algorithm}`;

  if (isLand(draft.input.property_type)) document.querySelector('h1').textContent = 'Giá đất ước tính';
 // BR-9: luôn hiện disclaimer; server không trả thì dùng câu mặc định.
  const note = document.createElement('p');
  note.className = 'field__hint';
  note.textContent = draft.disclaimer || predictionDisclaimer;
  document.querySelector('.result-summary').append(note);

  // BR-8: ngoài vùng dữ liệu huấn luyện thì cảnh báo, không giấu đi.
  if (draft.low_confidence) {
    const warn = document.getElementById('low-confidence');
    warn.textContent = 'Độ tin cậy thấp: thông tin nhập nằm ngoài vùng dữ liệu mô hình đã học. Khoảng giá đã được nới rộng, hãy dùng kết quả rất thận trọng.';
    warn.hidden = false;
  }
  const fields = propertyFacts(draft.input);
  const summary = document.getElementById('input-summary');
  for (const [label, value] of fields) {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value ?? 'Chưa có';
    summary.append(term, detail);
  }

  saveForm.hidden = false;
  historyLink.hidden = !loggedIn;
  if (!loggedIn) saveForm.querySelector('button').textContent = 'Đăng nhập để lưu dự đoán';
  result.hidden = false;
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

if (draft?.warnings) {
  const box = el('div', null, 'result-warnings'); box.append(el('strong', 'Đọc cùng kết quả'));
  const list = el('ul'); draft.warnings.forEach(w => list.append(el('li', w))); box.append(list);
  box.append(el('p', 'Khoảng giá được hiệu chỉnh ở mức mục tiêu 90% trên dữ liệu độc lập; không phải cam kết giá bán hoặc xác suất đúng của tài sản này.'));
  document.querySelector('.result-summary').append(box);
}
document.getElementById('compare-models').addEventListener('click', async event => {
  if (!isLoggedIn()) { requireLogin(); return; }
  const button = event.currentTarget; button.disabled = true;
  const target = document.getElementById('model-comparison'); target.textContent = 'Đang đối chiếu…';
  try {
    const access = await getEntitlements();
    if (access.plan !== 'premium') {
      target.replaceChildren(); const link = el('a', 'Mở Premium để so sánh các mô hình ↗', 'btn'); link.href = 'premium.html'; target.append(link); return;
    }
    const { items } = await getModels();
    const outcomes = await Promise.allSettled(items.map(m => createPrediction({...draft.input, model_id:m.id})));
    target.replaceChildren();
    outcomes.forEach((outcome, index) => {
      const card = el('article'); card.append(el('h3', items[index].name));
      if (outcome.status === 'fulfilled') {
        const p = outcome.value; card.append(el('strong', money(p.estimated_price)), el('p', `${money(p.confidence_interval.lower)} – ${money(p.confidence_interval.upper)}`), el('small', 'Cùng dữ liệu đầu vào · khoảng mục tiêu 90%'));
      } else card.append(el('p', outcome.reason.detail || 'Không tính được mô hình này.'));
      target.append(card);
    });
  } catch (error) { target.textContent = error.detail || 'Không tải được so sánh.'; }
  finally { button.disabled = false; }
});
