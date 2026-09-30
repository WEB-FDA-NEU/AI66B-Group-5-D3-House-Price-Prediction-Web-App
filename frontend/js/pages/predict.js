import { createPrediction, getMapListings, getLocations, getModels, getEntitlements } from '../api.js';
import { clearFieldErrors, setFieldError, toast } from '../ui.js';
import { isLand } from '../property.js';
import { isLoggedIn, clearSession } from '../auth.js';
import { LOCATION_SNAPSHOT } from '../location-snapshot.js';
import { createPremiumUpgrade } from '../components/premium-upgrade.js';

const form = document.getElementById('prediction-form');
const params = new URLSearchParams(location.search);
const submit = form.querySelector('button[type=submit]');
const notice = document.getElementById('prediction-service');
const draftKey = 'homeval_property_form_v2';
let locations = LOCATION_SNAPSHOT;
let catalog = [];
let access = { plan: 'free' };
let modelReady = false;
let submitting = false;
let refreshing = false;
let sourceListing = null;
let desiredModel = params.get('model') || sessionStorage.getItem('homeval_upgrade_model_id');
const numeric = new Set(['area_m2','bedrooms','bathrooms','floors','frontage_m','road_width_m']);
function readDraft() {
  try { const saved = JSON.parse(sessionStorage.getItem(draftKey)); return saved && Date.now() - saved.at < 86400000 ? saved.values : {}; } catch { return {}; }
}
function persist() {
  const values = Object.fromEntries(new FormData(form));
  try { sessionStorage.setItem(draftKey, JSON.stringify({at:Date.now(), values})); } catch { /* Form remains usable if storage is disabled. */ }
}
function message(text, kind = 'info') { notice.hidden = !text; notice.dataset.kind = kind; document.getElementById('service-message').textContent = text; }
function updateDistricts(preferred = '') {
  form.district.replaceChildren(new Option('Chọn quận/huyện', ''), ...(locations[form.city.value] || []).map(name => new Option(name, name)));
  if ([...form.district.options].some(o => o.value === preferred)) form.district.value = preferred;
  document.getElementById('location-hint').textContent = `${(locations[form.city.value] || []).length} khu vực có dữ liệu · Danh mục năm 2024.`;
}
function applyLocations(data) {
  if (!data || !Object.keys(data).length || !Object.values(data).every(values => Array.isArray(values) && values.every(v => typeof v === 'string'))) return;
  const city = form.city.value || 'Hồ Chí Minh'; const district = form.district.value;
  locations = data;
  form.city.replaceChildren(...Object.keys(locations).map(name => new Option(name, name)));
  form.city.value = locations[city] ? city : Object.keys(locations)[0];
  updateDistricts(district);
}
function updatePreview() {
  const land = isLand(form.property_type.value);
  form.dataset.kind = land ? 'land' : 'housing';
  const image = document.querySelector('.property-preview img');
  const src = land ? 'img/district-map.svg' : 'img/hero-house.jpg';
  if (!image.getAttribute('src')?.endsWith(src)) image.src = src;
  image.alt = land ? 'Sơ đồ khu vực minh họa cho tài sản đất' : 'Không gian nhà hiện đại tràn ánh sáng';
  document.getElementById('land-fields').hidden = !land;
  document.querySelectorAll('#land-fields input, #land-fields select').forEach(field => { field.disabled = !land; });
  document.querySelectorAll('.housing-field').forEach(wrapper => { wrapper.hidden = land; wrapper.querySelector('input').disabled = land; });
  form.area_m2.max = land ? '10000' : '1000';
  document.getElementById('preview-property').textContent = form.property_type.value || 'Bất động sản của bạn';
  document.getElementById('preview-location').textContent = form.district.value ? `${form.district.value} · ${form.city.value}` : 'Chọn khu vực để bắt đầu';
  document.getElementById('preview-area').textContent = (form.area_m2.value || '—') + ' m²';
  document.getElementById('preview-rooms').textContent = land ? `Mặt tiền ${form.frontage_m.value || '—'} m` : `${form.bedrooms.value || '0'} phòng ngủ`;
  document.getElementById('land-notice').hidden = !land;
  submit.disabled = land || !modelReady || submitting;
  submit.textContent = submitting ? 'Đang tính giá ước tính…' : land ? 'Chưa hỗ trợ định giá đất' : 'Xem giá ước tính ↗';
  document.getElementById('form-progress').textContent = form.district.value && form.property_type.value ? 'Thông tin cơ bản đã sẵn sàng' : 'Bắt đầu với vị trí và loại tài sản';
  document.querySelectorAll('[data-model-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.modelChoice === form.model_id.value)));
}
function setValues(values) {
  if (values.city && locations[values.city]) { form.city.value = values.city; updateDistricts(); }
  if (values.property_type) form.property_type.value = values.property_type;
  updatePreview();
  for (const [name,value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (!field || field.disabled || value == null) continue;
    if (field instanceof HTMLSelectElement) {
      if ([...field.options].some(o => !o.disabled && o.value === String(value))) field.value = String(value);
    } else if (field instanceof HTMLInputElement) field.value = String(value).slice(0, field.maxLength > 0 ? field.maxLength : 80);
  }
  updatePreview();
}
const upgrade = createPremiumUpgrade({beforeLogin:persist, onUnlocked:async entitlement => {
  access = entitlement; renderModels(); sessionStorage.removeItem('homeval_upgrade_model_id'); message('Premium đã mở. Chọn mô hình nâng cao bên dưới để tiếp tục.'); updatePreview(); persist();
}});
document.querySelectorAll('[data-open-upgrade]').forEach(button => button.addEventListener('click', () => { persist(); upgrade.open(); }));
function renderModels() {
  form.model_id.disabled = false;
  const chosen = form.model_id.value || desiredModel;
  const unlocked = m => m.tier === 'free' || access.plan === 'premium';
  form.model_id.replaceChildren(...catalog.map(m => { const option = new Option(`${m.name} · ${m.tier === 'premium' ? 'Premium' : 'Free'}`,m.id); option.disabled = !unlocked(m); return option; }));
  form.model_id.value = catalog.some(m => m.id === chosen && unlocked(m)) ? chosen : (catalog.find(unlocked)?.id || '');
  modelReady = !!form.model_id.value;
  const grid = document.getElementById('prediction-models'); grid.replaceChildren();
  catalog.forEach(m => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'model-option'; card.dataset.modelChoice = m.id;
    const badge = document.createElement('span'); badge.className = 'model-option__tier'; badge.textContent = unlocked(m) ? (m.tier === 'free' ? 'FREE' : 'PREMIUM') : '✧ MỞ VỚI PREMIUM';
    const title = document.createElement('strong'); title.textContent = m.name;
    const metric = document.createElement('small'); metric.textContent = `Sai số trung bình ${(m.metrics.mae_vnd/1e9).toLocaleString('vi-VN',{maximumFractionDigits:2})} tỷ`;
    card.append(badge,title,metric); card.dataset.locked = String(!unlocked(m));
    card.addEventListener('click', () => { if (!unlocked(m)) { desiredModel=m.id; sessionStorage.setItem('homeval_upgrade_model_id',m.id); persist(); upgrade.open(); } else { desiredModel=m.id; form.model_id.value=m.id; updatePreview(); persist(); } });
    grid.append(card);
  });
  if (access.plan === 'premium' && desiredModel && catalog.some(m => m.id === desiredModel)) form.model_id.value = desiredModel;
  document.getElementById('premium-in-context').hidden = access.plan === 'premium';
  document.getElementById('selected-model').textContent = access.plan === 'premium' ? 'Premium đang hoạt động · Chọn một góc nhìn để dự đoán' : 'Free đang sẵn sàng · Chạm mô hình Premium để xem quyền lợi';
  updatePreview();
}
async function refresh() {
  if (refreshing) return;
  refreshing = true; const retry = document.getElementById('retry-prediction'); retry.disabled = true;
  // Independent requests: failed/expired membership must not erase locations.
  const locationsTask = getLocations().then(data => { applyLocations(data.locations); updatePreview(); return true; }).catch(() => false);
  const accessTask = isLoggedIn() ? getEntitlements().then(data => { access=data; return ''; }).catch(error => {
    if (error.status === 401) { clearSession(); access={plan:'free'}; return 'Phiên đăng nhập đã hết hạn. Bạn vẫn có thể định giá Free; đăng nhập lại để dùng gói của mình.'; }
    return 'Chưa kiểm tra được gói tài khoản. Bạn có thể tiếp tục nhập thông tin và thử kết nối lại.';
  }) : Promise.resolve('');
  const catalogTask = getModels().then(data => { catalog=data.items; return true; }).catch(() => false);
  const [locationOk, authNote, catalogOk] = await Promise.all([locationsTask,accessTask,catalogTask]);
  if (catalogOk) renderModels(); else {
    modelReady=false; form.model_id.disabled=true;
    form.model_id.replaceChildren(new Option('Tạm chưa tải được mô hình', ''));
    document.getElementById('selected-model').textContent='Dùng nút Thử kết nối lại phía trên để tiếp tục.';
    updatePreview();
  }
  if (!catalogOk) message('Chưa kết nối được dịch vụ định giá. Danh sách quận/huyện và thông tin bạn nhập vẫn được giữ. Hãy thử kết nối lại.', 'error');
  else if (!modelReady) message('Chưa có mô hình được phát hành. Bạn có thể chuẩn bị thông tin và thử lại sau.', 'error');
  else if (authNote) message(authNote);
  else if (!locationOk) message('Đang dùng danh mục khu vực dự phòng từ dữ liệu 2024. Máy chủ sẽ kiểm tra lại khu vực khi định giá.');
  else message('');
  refreshing=false; retry.disabled=false;
}
// Render the known location catalog immediately, before any network or auth request.
applyLocations(LOCATION_SNAPSHOT);
const initial = {...readDraft(), ...Object.fromEntries(params)};
desiredModel ||= initial.model_id;
setValues(initial);
form.city.addEventListener('change', () => { updateDistricts(); updatePreview(); persist(); });
form.addEventListener('input', () => { updatePreview(); persist(); });
form.addEventListener('change', () => { updatePreview(); persist(); });
form.property_type.addEventListener('change', () => clearFieldErrors(form));
document.getElementById('retry-prediction').addEventListener('click', refresh);
window.addEventListener('online', refresh);
await refresh();
if (params.get('listing')) {
  try {
    const data=await getMapListings(); sourceListing=data.items.find(item => item.id === params.get('listing'));
    if (sourceListing) { setValues(sourceListing); const note=document.getElementById('map-source'); note.textContent=`Đã điền từ bản đồ demo: ${sourceListing.title}. Đây là thông tin minh họa; hãy kiểm tra lại khu vực.`; note.hidden=false; }
  } catch { message('Không tải được tài sản mẫu. Bạn có thể nhập thông tin thủ công.'); }
}
if (sessionStorage.getItem('homeval_upgrade_intent') === '1') { sessionStorage.removeItem('homeval_upgrade_intent'); if (access.plan !== 'premium') upgrade.open(); }
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!modelReady || submitting || isLand(form.property_type.value)) return;
  clearFieldErrors(form); let valid=true;
  for (const field of form.querySelectorAll('input, select')) if (!field.disabled && !field.validity.valid) { setFieldError(field,'Vui lòng nhập giá trị hợp lệ trong phạm vi cho phép.'); valid=false; }
  if (Number(form.bathrooms.value)>Number(form.bedrooms.value)+2) { setFieldError(form.bathrooms,'Số phòng tắm không được vượt số phòng ngủ quá 2.'); valid=false; }
  if (!valid) { form.querySelector('[aria-invalid=true]')?.focus(); return; }
  const input=Object.fromEntries(new FormData(form));
  for (const key of numeric) { if (input[key] === '') delete input[key]; else if (key in input) input[key]=Number(input[key]); }
  if (sourceListing) input.source_listing_id=sourceListing.id;
  submitting=true; form.setAttribute('aria-busy','true'); updatePreview(); persist();
  try {
    const prediction=await createPrediction(input); sessionStorage.setItem('homeval_prediction_draft',JSON.stringify(prediction)); location.href='predict-result.html';
  } catch (error) {
    if (error.status === 401) { clearSession(); await refresh(); }
    message(error.detail || 'Không thể tạo dự đoán. Thông tin đã được giữ lại; bạn có thể thử lại.','error'); toast(error.detail || 'Không thể tạo dự đoán.','error');
  } finally { submitting=false; form.removeAttribute('aria-busy'); updatePreview(); }
});
