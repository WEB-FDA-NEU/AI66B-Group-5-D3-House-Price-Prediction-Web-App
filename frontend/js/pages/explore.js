import '../components/site-header.js';
import '../components/site-footer.js';
import { getMapListings } from '../api.js';
import { isLand } from '../property.js';

const svg = document.getElementById('property-map');
const pins = document.getElementById('map-pins');
const list = document.getElementById('map-list');
const selection = document.getElementById('map-selection');
const count = document.getElementById('map-count');
const district = document.getElementById('map-district');
const type = document.getElementById('map-type');
const state = { items: [], zoom: 1, cx: 600, cy: 400, selected: null, drag: null };
const NS = 'http://www.w3.org/2000/svg';
const format = n => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n / 1e9) + ' tỷ';
document.querySelector('.map-results-heading').after(selection);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function bounds() {
  const width = 1200 / state.zoom, height = 800 / state.zoom;
  state.cx = Math.max(width / 2, Math.min(1200 - width / 2, state.cx));
  state.cy = Math.max(height / 2, Math.min(800 - height / 2, state.cy));
  return { x: state.cx - width / 2, y: state.cy - height / 2, width, height };
}
function matching() {
  return state.items.filter(item => (!district.value || item.district === district.value) && (!type.value || item.property_type === type.value));
}
function visible() {
  const b = bounds();
  return matching().filter(item => item.x >= b.x && item.x <= b.x + b.width && item.y >= b.y && item.y <= b.y + b.height);
}
function clearSelection() { state.selected = null; selection.hidden = true; selection.replaceChildren(); }
function choose(item) {
  state.selected = item.id;
  selection.replaceChildren();
  const label = element('span', 'pill', 'TÀI SẢN MẪU ĐANG CHỌN');
  const heading = element('h3', '', item.title);
  const description = element('p', '', item.description);
  const facts = element('div', 'selection-meta');
  for (const fact of [item.property_type, item.district, item.area_m2 + ' m²', isLand(item.property_type) ? 'Mặt tiền ' + item.frontage_m + ' m' : item.bedrooms + ' phòng ngủ']) facts.append(element('span', '', fact));
  const price = element('strong', 'listing-price', format(item.asking_price));
  price.append(element('small', '', 'Giá chào mô phỏng'));
  const link = element('a', 'btn btn--primary', 'Định giá tài sản này ↗');
  link.href = 'predict.html?listing=' + encodeURIComponent(item.id);
  const close = element('button', 'text-link', '← Bỏ chọn');
  close.type = 'button';
  close.style.cssText = 'border:0;background:none;padding:0;cursor:pointer;margin-bottom:8px';
  close.addEventListener('click', () => { clearSelection(); render(); });
  selection.append(close, label, heading, description, facts, price, link);
  selection.hidden = false;
  renderPins(visible());
  for (const card of list.querySelectorAll('.listing-card')) card.classList.toggle('selected', card.dataset.id === item.id);
  selection.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
function renderPins(items) {
  pins.replaceChildren();
  const b = bounds();
  const pixelsPerUnit = Math.min(svg.clientWidth / b.width, svg.clientHeight / b.height);
  const pinScale = .8 / pixelsPerUnit;
  for (const item of items) {
    const pin = document.createElementNS(NS, 'g');
    pin.setAttribute('class', 'map-pin' + (isLand(item.property_type) ? ' land' : '') + (state.selected === item.id ? ' selected' : ''));
    pin.setAttribute('transform', 'translate(' + item.x + ' ' + item.y + ') scale(' + pinScale + ')');
    pin.setAttribute('tabindex', '0');
    pin.setAttribute('role', 'button');
    pin.setAttribute('aria-label', item.title + ', ' + format(item.asking_price));
    pin.dataset.id = item.id;
    const rect = document.createElementNS(NS, 'rect');
    for (const [key,value] of Object.entries({ x:-44,y:-19,width:88,height:38,rx:19 })) rect.setAttribute(key,value);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('text-anchor', 'middle'); text.setAttribute('y', '5'); text.textContent = format(item.asking_price);
    pin.append(rect, text);
    pin.addEventListener('click', () => choose(item));
    pin.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(item); linkFocus(); } });
    pins.append(pin);
  }
}
function linkFocus() { selection.querySelector('a')?.focus({ preventScroll: true }); }
function render() {
  const b = bounds();
  svg.setAttribute('viewBox', [b.x,b.y,b.width,b.height].join(' '));
  document.getElementById('zoom-label').textContent = state.zoom.toFixed(1) + '×';
  document.getElementById('zoom-out').disabled = state.zoom <= 1;
  document.getElementById('zoom-in').disabled = state.zoom >= 4;
  const items = visible();
  if (state.selected && !items.some(item => item.id === state.selected)) clearSelection();
  count.textContent = items.length + ' tài sản mẫu · ' + matching().length + ' khớp bộ lọc';
  renderPins(items);
  list.replaceChildren();
  if (!items.length) {
    const empty = element('div', 'empty');
    empty.append(element('p', 'field__hint', 'Không có tài sản mẫu trong vùng này. Thử thu nhỏ hoặc bỏ bộ lọc.'));
    const reset = element('button', 'btn', 'Xem toàn bộ dữ liệu mẫu');
    reset.type = 'button'; reset.addEventListener('click', () => { district.value = ''; type.value = ''; resetMap(); });
    empty.append(reset); list.append(empty); return;
  }
  for (const item of items) {
    const card = element('button', 'listing-card' + (state.selected === item.id ? ' selected' : ''));
    card.type = 'button'; card.dataset.id = item.id;
    const top = element('div', 'listing-top');
    top.append(element('span', isLand(item.property_type) ? 'land-tag' : '', item.property_type), element('span', '', 'DEMO'));
    const value = element('strong', 'listing-price', format(item.asking_price));
    value.append(element('small', '', 'Giá chào mẫu'));
    card.append(top, element('h3', '', item.title), element('p', '', item.district + ' · ' + item.area_m2 + ' m²'), value);
    card.addEventListener('click', () => choose(item));
    list.append(card);
  }
}
function zoom(delta) { state.zoom = Math.min(4, Math.max(1, Math.round((state.zoom + delta) * 10) / 10)); render(); }
function pan(x,y) { state.cx += x * 150 / state.zoom; state.cy += y * 150 / state.zoom; render(); }
function resetMap() { Object.assign(state, { zoom: 1, cx: 600, cy: 400 }); clearSelection(); render(); }
document.getElementById('zoom-in').addEventListener('click', () => zoom(.5));
document.getElementById('zoom-out').addEventListener('click', () => zoom(-.5));
document.getElementById('map-reset').addEventListener('click', resetMap);
const directions = { left: [-1,0], right: [1,0], up: [0,-1], down: [0,1] };
for (const button of document.querySelectorAll('[data-pan]')) button.addEventListener('click', () => pan(...directions[button.dataset.pan]));
district.addEventListener('change', () => {
  clearSelection();
  const items = state.items.filter(item => item.district === district.value);
  if (items.length) {
    state.zoom = 1.7;
    state.cx = items.reduce((n,p) => n+p.x,0) / items.length;
    state.cy = items.reduce((n,p) => n+p.y,0) / items.length;
    render();
  } else resetMap();
});
type.addEventListener('change', () => { clearSelection(); render(); });
svg.addEventListener('keydown', event => {
  const move = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }[event.key];
  if (move) { event.preventDefault(); pan(...move); svg.focus({ preventScroll: true }); }
  else if (['+','=','-'].includes(event.key)) { event.preventDefault(); zoom(event.key === '-' ? -.5 : .5); }
});
svg.addEventListener('pointerdown', event => {
  if (event.target.closest('.map-pin')) return;
  if (event.button !== 0 || !event.isPrimary) return;
  svg.focus({ preventScroll: true });
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  state.drag = { point, cx: state.cx, cy: state.cy, transform: svg.getScreenCTM().inverse() };
  svg.setPointerCapture(event.pointerId); svg.classList.add('is-dragging');
});
svg.addEventListener('pointermove', event => {
  if (!state.drag) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(state.drag.transform);
  state.cx = state.drag.cx - (point.x - state.drag.point.x);
  state.cy = state.drag.cy - (point.y - state.drag.point.y);
  render();
});
for (const name of ['pointerup','pointercancel','lostpointercapture']) svg.addEventListener(name, () => { state.drag = null; svg.classList.remove('is-dragging'); });
svg.addEventListener('wheel', event => {
  if (!event.ctrlKey && document.activeElement !== svg) return;
  event.preventDefault();
  zoom(event.deltaY > 0 ? -.2 : .2);
}, { passive: false });
new ResizeObserver(() => renderPins(visible())).observe(svg);
async function load() {
  count.textContent = 'Đang tải dữ liệu mẫu…';
  list.replaceChildren();
  try {
    const data = await getMapListings();
    state.items = data.items;
    render();
  } catch (error) {
    count.textContent = 'Không tải được dữ liệu bản đồ';
    const message = element('p', 'field__hint', error.detail || 'Vui lòng thử lại.');
    const retry = element('button', 'btn', 'Thử lại');
    retry.type = 'button'; retry.addEventListener('click', load);
    list.append(message,retry);
  }
}
load();
