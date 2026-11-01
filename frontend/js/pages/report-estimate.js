import { createEstimateReport, getDemoPrediction, getEstimateReports } from '../api.js';
import { isLoggedIn, requireLogin } from '../auth.js';
import { clearFieldErrors, setFieldError } from '../ui.js';
import { propertyFacts } from '../property.js';

const demo = new URLSearchParams(location.search).get('demo') === '1';
const context = document.getElementById('prediction-context');
const workspace = document.getElementById('report-workspace');
const loginRequired = document.getElementById('login-required');
const missingPrediction = document.getElementById('missing-prediction');
const form = document.getElementById('report-form');
const list = document.getElementById('reports-list');
const loading = document.getElementById('reports-loading');
const empty = document.getElementById('reports-empty');
const reportsError = document.getElementById('reports-error');
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
let prediction;
let reports = [];

function readPredictionDraft() {
  try {
    const stored = JSON.parse(sessionStorage.getItem('homeval_prediction_draft') || 'null');
    return stored?.id && stored?.input && Number.isFinite(stored.estimated_price) ? stored : null;
  } catch {
    return null;
  }
}

function showLoginRequired() {
  loginRequired.hidden = false;
  workspace.hidden = true;
}

function renderContext() {
  document.getElementById('report-estimated-price').textContent = currency.format(prediction.estimated_price);
  document.getElementById('report-estimate-hint').textContent = currency.format(prediction.estimated_price);
  const details = document.getElementById('report-property');
  for (const [label, value] of propertyFacts(prediction.input)) {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value ?? 'Chưa có';
    details.append(term, description);
  }
  context.hidden = false;
}

function renderReport(report) {
  const article = document.createElement('article');
  article.className = 'report-card';

  const prices = document.createElement('p');
  prices.className = 'report-card__prices';
  const estimated = document.createElement('span');
  estimated.textContent = `HomeVal ước tính: ${currency.format(report.estimated_price)}`;
  const expected = document.createElement('strong');
  expected.textContent = `Giá kỳ vọng: ${currency.format(report.expected_price)}`;
  prices.append(estimated, expected);

  const comment = document.createElement('p');
  comment.className = 'report-card__comment';
  comment.textContent = report.comment;

  const createdAt = document.createElement('p');
  createdAt.className = 'report-card__meta';
  createdAt.textContent = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(report.created_at));
  article.append(prices, comment, createdAt);
  return article;
}

function renderReports() {
  list.replaceChildren(...reports.map(renderReport));
  empty.hidden = reports.length > 0;
}

async function loadReports() {
  loading.hidden = false;
  loading.setAttribute('aria-busy', 'true');
  reportsError.hidden = true;
  empty.hidden = true;
  try {
    const result = await getEstimateReports({ demo });
    reports = result.items;
    renderReports();
  } catch (error) {
    if (error.status === 401) {
      showLoginRequired();
      return;
    }
    document.getElementById('reports-error-message').textContent =
      error.detail || 'Không thể tải báo cáo. Vui lòng thử lại.';
    reportsError.hidden = false;
  } finally {
    loading.hidden = true;
    loading.removeAttribute('aria-busy');
  }
}

function validateForm() {
  clearFieldErrors(form);
  document.getElementById('report-submit-error').hidden = true;
  document.getElementById('report-submit-success').hidden = true;
  const price = form.elements.expected_price;
  const comment = form.elements.comment.value.trim();
  let valid = true;
  if (!Number.isSafeInteger(price.valueAsNumber) || price.valueAsNumber < 1 ||
      price.valueAsNumber > 1_000_000_000_000) {
    setFieldError(price, 'Nhập giá kỳ vọng là số nguyên dương, tối đa 1.000 tỷ đồng.');
    valid = false;
  } else if (price.valueAsNumber === prediction.estimated_price) {
    setFieldError(price, 'Giá kỳ vọng cần khác giá ước tính để báo sai lệch.');
    valid = false;
  }
  if (comment.length < 10 || comment.length > 1000) {
    setFieldError(form.elements.comment, 'Bình luận cần có từ 10 đến 1.000 ký tự.');
    valid = false;
  }
  return valid;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validateForm()) return;
  if (!demo && !isLoggedIn()) {
    showLoginRequired();
    return;
  }

  const button = document.getElementById('report-submit');
  button.disabled = true;
  try {
    const report = await createEstimateReport({
      prediction_id: prediction.id,
      draft_token: prediction.draft_token ?? '',
      expected_price: form.elements.expected_price.valueAsNumber,
      comment: form.elements.comment.value.trim(),
    }, { demo, prediction });
    reports.unshift(report);
    renderReports();
    form.reset();
    clearFieldErrors(form);
    const success = document.getElementById('report-submit-success');
    success.textContent = 'Đã gửi báo cáo. Cảm ơn bạn đã giúp HomeVal cải thiện ước tính.';
    success.hidden = false;
  } catch (error) {
    if (error.status === 401) {
      showLoginRequired();
    } else {
      const message = document.getElementById('report-submit-error');
      message.textContent = error.detail || 'Không thể gửi báo cáo. Vui lòng thử lại.';
      message.hidden = false;
    }
  } finally {
    button.disabled = false;
  }
});

document.getElementById('reports-retry').addEventListener('click', loadReports);
document.getElementById('report-login').addEventListener('click', requireLogin);

async function initialize() {
  prediction = readPredictionDraft();
  if (!prediction && demo) {
    prediction = await getDemoPrediction();
    sessionStorage.setItem('homeval_prediction_draft', JSON.stringify(prediction));
  }
  if (!prediction) {
    missingPrediction.hidden = false;
    return;
  }

  renderContext();
  if (demo) document.getElementById('demo-notice').hidden = false;
  if (!demo && !isLoggedIn()) {
    showLoginRequired();
    return;
  }

  workspace.hidden = false;
  await loadReports();
}

initialize().catch(error => {
  missingPrediction.hidden = false;
  const message = document.createElement('p');
  message.className = 'report-error';
  message.setAttribute('role', 'alert');
  message.textContent = error.detail || 'Không thể tải dữ liệu dự đoán mẫu.';
  missingPrediction.append(message);
});
