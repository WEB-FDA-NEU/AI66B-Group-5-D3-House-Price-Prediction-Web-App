import { getModels } from './api.js';
export const money = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1e9) + ' tỷ';
export const percent = value => Number(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
export function el(tag, text, className) {
  const node = document.createElement(tag); if (text != null) node.textContent = text;
  if (className) node.className = className; return node;
}
export function modelCard(model) {
  const card = el('article', null, 'model-card' + (model.tier === 'premium' ? ' model-card--premium' : ''));
  card.append(el('span', model.tier === 'premium' ? '✧ PREMIUM' : 'FREE', 'tier-pill'), el('h3', model.name), el('p', model.algorithm, 'model-algorithm'), el('p', model.summary));
  card.append(el('div', money(model.metrics.mae_vnd), 'model-score'), el('span', 'Sai số tuyệt đối trung bình · càng thấp càng tốt', 'score-label'));
  const bar = el('div', null, 'metric-bar'); const fill = el('span'); fill.style.width = `${Math.min(100, model.metrics.within_20_percent)}%`; bar.append(fill); card.append(bar);
  card.append(el('p', `${percent(model.metrics.within_20_percent)} mẫu kiểm tra có sai số không quá 20%.`, 'score-label'));
  for (const [title, items, cls] of [['Điểm mạnh', model.pros, 'pros'], ['Cần cân nhắc', model.cons, 'cons']]) {
    card.append(el('h4', title)); const list = el('ul', null, cls); items.forEach(item => list.append(el('li', item))); card.append(list);
  }
  card.append(el('p', 'Phù hợp: ' + model.suitable, 'card-fit'));
  const link = el('a', 'Dùng góc nhìn này ↗', 'btn'); link.href = `predict.html?model=${encodeURIComponent(model.id)}`; card.append(link); return card;
}
export async function loadCatalog(target) {
  target.setAttribute('aria-busy', 'true');
  try {
    const data = await getModels(); target.replaceChildren(...data.items.map(modelCard));
    if (!data.items.length) target.append(el('p', 'Admin chưa phát hành mô hình. Vui lòng quay lại sau.'));
    return data;
  } catch (error) { target.replaceChildren(el('p', error.detail || 'Không tải được mô hình. Hãy thử tải lại trang.', 'model-error')); throw error; }
  finally { target.removeAttribute('aria-busy'); }
}
