// ============================================================
//  Tầng DUY NHẤT được phép gọi mạng.
//  Không file nào khác được viết fetch().
//
//  CHIA VÙNG THEO NGƯỜI để tránh conflict Git - mỗi người chỉ
//  thêm hàm vào vùng của mình.
// ============================================================
import { USE_MOCK, API_BASE, MOCK_BASE } from './config.js';
import { getToken, getUser } from './auth.js';
import { isLand } from './property.js';

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || 'Đã có lỗi xảy ra.');
    this.status = status;
    this.detail = detail;
  }
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000), ...options, headers });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }

  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* body rỗng */ }
  if (!res.ok) throw new ApiError(res.status, normalizeDetail(data?.detail));
  return data;
}

/** FastAPI trả 422 dạng MẢNG, các mã khác trả CHUỖI.
 *  Không xử lý chỗ này thì người dùng thấy "[object Object]". */
function normalizeDetail(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => `${e.loc?.at(-1) ?? ''}: ${e.msg}`).join('\n');
  return null;
}

/**
 * Shared mock boundary for every HomeVal screen. Page modules must call one
 * of the exported functions below instead of fetching a JSON fixture directly.
 * This keeps the Mock 2 -> API migration in this file.
 */
function getMock(name) {
  return request(`${MOCK_BASE}/${name}.json`).catch(error => {
    const fixture = INLINE_MOCKS[name];
    if (!fixture) throw error;
    return JSON.parse(JSON.stringify(fixture));
  });
}

const MOCK_USERS_KEY = 'homeval_mock_registered_users';
const MOCK_USER_OVERRIDES_KEY = 'homeval_mock_user_overrides';
const MOCK_CREDENTIALS_KEY = 'homeval_mock_credentials';
const MOCK_PREDICTIONS_KEY = 'homeval_mock_predictions';
const MOCK_DEFAULT_CREDENTIALS = Object.freeze({
  'anh@example.com': 'password123',
  'admin@homeval.vn': 'admin123',
});
const INLINE_MOCKS = Object.freeze({
  users: {
    items: [
      { id: 'u-001', display_name: 'Nguyễn Minh Anh', email: 'anh@example.com', phone: '', role: 'user', status: 'Active', prediction_count: 7, created_at: '2026-09-03T10:00:00Z' },
      { id: 'u-002', display_name: 'Quản trị viên', email: 'admin@homeval.vn', phone: '', role: 'admin', status: 'Active', prediction_count: 0, created_at: '2026-08-18T08:30:00Z' },
    ], total: 2,
  },
  'prediction-result': {
    estimated_price: 4850000000, currency: 'VND',
    confidence_interval: { lower: 4460000000, upper: 5240000000, confidence_level: 0.9 },
    confidence: 0.86, model: { version: 'v2.3.0', algorithm: 'Gradient Boosting' },
    input: { district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72, bedrooms: 3, bathrooms: 2, floors: 2 },
  },
  'prediction-history': {
    items: [
      { id: 'pred-20260927-001', owner_id: 'u-001', label: 'Nhà ở gần metro', district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72, estimated_price: 4850000000, currency: 'VND', model_version: 'v2.3.0', input: { district: 'Thủ Đức', property_type: 'Nhà phố', area_m2: 72, bedrooms: 3, bathrooms: 2, floors: 2 }, created_at: '2026-09-27T09:30:00Z' },
      { id: 'pred-20260922-002', owner_id: 'u-001', label: 'Căn hộ đầu tư', district: 'Bình Thạnh', property_type: 'Căn hộ', area_m2: 58, estimated_price: 3180000000, currency: 'VND', model_version: 'v2.3.0', input: { district: 'Bình Thạnh', property_type: 'Căn hộ', area_m2: 58, bedrooms: 2, bathrooms: 2, floors: 1 }, created_at: '2026-09-22T14:15:00Z' },
      { id: 'pred-20260918-003', owner_id: 'u-001', label: 'Nhà phố Quận 7', district: 'Quận 7', property_type: 'Nhà phố', area_m2: 95, estimated_price: 6920000000, currency: 'VND', model_version: 'v2.2.0', input: { district: 'Quận 7', property_type: 'Nhà phố', area_m2: 95, bedrooms: 4, bathrooms: 3, floors: 3 }, created_at: '2026-09-18T08:45:00Z' },
    ],
  },
  models: {
    items: [
      { id: 'm-v230', version: 'v2.3.0', algorithm: 'Gradient Boosting', dataset: 'housing-hcm-2026q2.csv', mae: 145000000, r2: 0.87, upload_date: '2026-09-18T09:00:00Z', state: 'Active' },
      { id: 'm-v240rc1', version: 'v2.4.0-rc1', algorithm: 'Gradient Boosting', dataset: 'housing-hcm-2026q3.csv', mae: 138000000, r2: 0.89, upload_date: '2026-09-25T10:05:00Z', state: 'Validated' },
      { id: 'm-v220', version: 'v2.2.0', algorithm: 'Random Forest', dataset: 'housing-hcm-2026q1.csv', mae: 162000000, r2: 0.84, upload_date: '2026-07-30T09:00:00Z', state: 'Archived' },
    ], total: 3,
  },
  'admin-stats': {
    users_total: 128, predictions_today: 34, predictions_week: 210,
    active_model: { version: 'v2.3.0', algorithm: 'Gradient Boosting', r2: 0.87 }, api_errors_24h: 0,
    predictions_per_day: [{ date: '09-24', count: 34 }, { date: '09-25', count: 29 }, { date: '09-26', count: 34 }],
    recent_activity: [{ id: 1, text: 'admin@homeval.vn đã kích hoạt v2.3.0', created_at: '2026-09-26T08:10:00Z' }],
  },
});

function readMockStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function getMockUsers() {
  return getMock('users').then(data => {
    const overrides = readMockStorage(MOCK_USER_OVERRIDES_KEY, {});
    const registered = readMockStorage(MOCK_USERS_KEY, []);
    const items = [
      ...data.items.map(user => ({ ...user, ...overrides[user.id] })),
      ...registered.map(user => ({ ...user, ...overrides[user.id] })),
    ];
    return { ...data, items, total: items.length };
  });
}

function normalisePage(page, pageSize, total) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Number(pageSize) || 10);
  return {
    page: safePage,
    page_size: safeSize,
    total,
    start: (safePage - 1) * safeSize,
  };
}

// ══════════ NGƯỜI 1 - danh sách & chi tiết ══════════
// TODO: đổi getItems/getItem thành tên hợp đề tài
//       (getListings / getConcerts / getHomestays / getRecipes …)

export function getItems(params = {}) {
  if (USE_MOCK) return request(`${MOCK_BASE}/items.json`).then(d => filterMock(d, params));
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  );
  return request(`${API_BASE}/items?${qs}`);
}

export function getItem(id) {
  if (USE_MOCK) return request(`${MOCK_BASE}/item-${id}.json`);
  return request(`${API_BASE}/items/${id}`);
}

// ══════════ NGƯỜI 2 - tài khoản ══════════

export function login(email, password) {
  if (USE_MOCK) {
    const normalizedEmail = email.trim().toLowerCase();
    return Promise.all([
      getMockUsers(),
      Promise.resolve(getMockCredentials()),
    ]).then(([data, credentials]) => {
      const user = data.items.find(entry => entry.email.toLowerCase() === normalizedEmail);
      if (!user || credentials[normalizedEmail] !== password)
        throw new ApiError(401, 'Email hoặc mật khẩu không đúng.');
      return { access_token: 'mock-token', token_type: 'bearer', user };
    });
  }
  return request(`${API_BASE}/auth/login`, { method: 'POST', body: { email, password } });
}

export function register(payload) {
  if (USE_MOCK) {
    return getMockUsers().then(data => {
      const email = payload.email.trim().toLowerCase();
      if (data.items.some(user => user.email.toLowerCase() === email))
        throw new ApiError(409, 'Email này đã được đăng ký.');

      const nextId = data.items.reduce((maxId, user) => {
        const match = String(user.id).match(/(\d+)$/);
        return Math.max(maxId, match ? Number(match[1]) : 0);
      }, 0) + 1;
      const user = {
        id: `u-${String(nextId).padStart(3, '0')}`,
        display_name: payload.display_name.trim(),
        email,
        phone: payload.phone?.trim() ?? '',
        role: 'user',
        status: 'Active',
        prediction_count: 0,
        created_at: new Date().toISOString(),
      };
      const registered = readMockStorage(MOCK_USERS_KEY, []);
      registered.push(user);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(registered));

      const credentials = readMockStorage(MOCK_CREDENTIALS_KEY, {});
      credentials[email] = payload.password;
      localStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify(credentials));
      return { access_token: 'mock-token', token_type: 'bearer', user };
    });
  }
  return request(`${API_BASE}/auth/register`, { method: 'POST', body: payload });
}

// ══════════ NGƯỜI 3 - Trang chủ & Giới thiệu mô hình (Hải): GU-1/GU-5 mock ══════════

export function getModelInfo() {
  if (USE_MOCK) return request(`${MOCK_BASE}/model.json`);
  return request(`${API_BASE}/model`);
}

// HomeVal prediction, history and market-insight contract.

export function createPrediction(input) {
  if (USE_MOCK) {
    if (isLand(input.property_type)) {
      // An explicit demo formula, not a trained model or market valuation.
      const rate = { 'Thủ Đức': 42000000, 'Bình Thạnh': 62000000, 'Quận 7': 51000000, 'Quận 1': 95000000 }[input.district] || 42000000;
      const estimate = Math.round(rate * input.area_m2 * (input.land_use === 'Đất nông nghiệp' ? 0.3 : 1));
      return Promise.resolve({
        id: `draft-${Date.now()}`, estimated_price: estimate, currency: 'VND',
        confidence_interval: { lower: Math.round(estimate * 0.8), upper: Math.round(estimate * 1.2) },
        model: { version: 'land-demo-0.1', algorithm: 'Công thức minh họa đất nền' },
        input: { ...input }, is_mock: true, created_at: new Date().toISOString(),
        disclaimer: 'Dữ liệu đất mô phỏng; khoảng giá là giả lập, chưa được kiểm định và không xác minh pháp lý/quy hoạch.',
      });
    }
    return getMock('prediction-result').then(result => ({
      ...result,
      id: `draft-${Date.now()}`,
      input: { ...input },
      created_at: new Date().toISOString(),
      is_mock: true,
    }));
  }
  return request(`${API_BASE}/predictions`, { method: 'POST', body: input });
}

export async function getMapListings() {
  if (!USE_MOCK) return request(`${API_BASE}/map-listings`);
  return getMock('map-listings');
}

// Live APIs: entitlements are enforced on the server.
export const getModels = () => request(`${API_BASE}/models`);
export const getLocations = () => request(`${API_BASE}/locations`);
export const getEntitlements = () => request(`${API_BASE}/me/entitlements`);
export const startCheckout = () => request(`${API_BASE}/billing/checkout`, { method: 'POST', body: { plan: 'premium-monthly' } });
export const completeCheckout = (id, outcome) => request(`${API_BASE}/billing/checkout/${encodeURIComponent(id)}/complete`, { method: 'POST', body: { outcome } });
export const startTraining = config => request(`${API_BASE}/admin/training`, { method: 'POST', body: config });
export const getTrainingJob = id => request(`${API_BASE}/admin/training/${encodeURIComponent(id)}`);

export function getPredictionHistory({ q = '', page = 1, pageSize = 10 } = {}) {
  if (USE_MOCK) {
    return getMock('prediction-history').then(data => {
      const user = requireMockUser();
      const keyword = q.trim().toLowerCase();
      const items = [...new Map([...data.items, ...getMockPredictionStore()]
        .map(item => [item.id, item])).values()]
        .filter(item => item.owner_id === user.id && !item.deleted_at)
        .filter(item => !keyword || Object.values(item).some(value =>
          String(value).toLowerCase().includes(keyword)))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const paging = normalisePage(page, pageSize, items.length);
      return { ...paging, items: items.slice(paging.start, paging.start + paging.page_size) };
    });
  }
  const qs = new URLSearchParams({ page, page_size: pageSize });
  if (q) qs.set('q', q);
  return request(`${API_BASE}/me/predictions?${qs}`);
}

export function getPrediction(id) {
  if (USE_MOCK) {
    return getMock('prediction-history').then(data => {
      const user = requireMockUser();
      const item = [...new Map([...data.items, ...getMockPredictionStore()]
        .map(entry => [entry.id, entry])).values()].find(entry =>
        String(entry.id) === String(id) && entry.owner_id === user.id && !entry.deleted_at);
      if (!item) throw new ApiError(404, 'Không tìm thấy dự báo này.');
      return item;
    });
  }
  return request(`${API_BASE}/me/predictions/${encodeURIComponent(id)}`);
}

export function savePrediction(prediction, label = '') {
  if (USE_MOCK) {
    const user = requireMockUser();
    const input = prediction.input ?? {};
    const item = {
      id: `pred-${Date.now()}`,
      owner_id: user.id,
      label: label.trim(),
      district: input.district ?? 'Chưa xác định',
      property_type: input.property_type ?? 'Nhà ở',
      area_m2: Number(input.area_m2) || 0,
      estimated_price: prediction.estimated_price,
      currency: prediction.currency ?? 'VND',
      confidence_interval: prediction.confidence_interval ? { ...prediction.confidence_interval } : null,
      disclaimer: prediction.disclaimer ?? 'Ước tính chỉ mang tính tham khảo, không thay thế định giá chuyên nghiệp.',
      model_version: prediction.model?.version ?? 'v2.3.0',
      input: { ...input },
      created_at: new Date().toISOString(),
    };
    const predictions = getMockPredictionStore();
    predictions.push(item);
    localStorage.setItem(MOCK_PREDICTIONS_KEY, JSON.stringify(predictions));
    return Promise.resolve(item);
  }
  return request(`${API_BASE}/me/predictions`, { method: 'POST', body: { prediction, label } });
}

export function deletePrediction(id) {
  if (USE_MOCK) {
    const user = requireMockUser();
    const predictions = getMockPredictionStore();
    const stored = predictions.find(item => String(item.id) === String(id) && item.owner_id === user.id);
    if (stored) {
      stored.deleted_at = new Date().toISOString();
      localStorage.setItem(MOCK_PREDICTIONS_KEY, JSON.stringify(predictions));
      return Promise.resolve(null);
    }
    return getMock('prediction-history').then(data => {
      const seeded = data.items.find(item => String(item.id) === String(id) && item.owner_id === user.id);
      if (!seeded) throw new ApiError(404, 'Không tìm thấy dự báo này.');
      predictions.push({ ...seeded, deleted_at: new Date().toISOString() });
      localStorage.setItem(MOCK_PREDICTIONS_KEY, JSON.stringify(predictions));
      return null;
    });
  }
  return request(`${API_BASE}/me/predictions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getMarketInsights() {
  if (USE_MOCK) return getMock('market-insights');
  return request(`${API_BASE}/insights`);
}

// Existing admin screens use the model functions below. These two functions
// reserve the same adapter boundary for Dataset and User screens.
export function listDatasets() {
  if (USE_MOCK) return getMock('datasets');
  return request(`${API_BASE}/admin/datasets`);
}

export function listUsers({ q = '', page = 1, pageSize = 10 } = {}) {
  if (USE_MOCK) {
    return getMockUsers().then(data => {
      const keyword = q.trim().toLowerCase();
      const items = keyword
        ? data.items.filter(user => [user.display_name, user.email, user.role]
            .some(value => String(value ?? '').toLowerCase().includes(keyword)))
        : data.items;
      const paging = normalisePage(page, pageSize, items.length);
      return { ...paging, items: items.slice(paging.start, paging.start + paging.page_size) };
    });
  }
  const qs = new URLSearchParams({ page, page_size: pageSize });
  if (q) qs.set('q', q);
  return request(`${API_BASE}/admin/users?${qs}`);
}

export const MOCK_UI_STATES = Object.freeze({
  loading: 'Đang tải dữ liệu…',
  empty: 'Chưa có dữ liệu để hiển thị.',
  validation: 'Thông tin nhập chưa hợp lệ.',
  unauthorized: 'Bạn cần đăng nhập để tiếp tục.',
  network: 'Không thể kết nối máy chủ. Hãy thử lại.',
  notFound: 'Không tìm thấy nội dung bạn yêu cầu.',
});

// ══════════ NGƯỜI 4 - TODO: thêm vùng của em ở đây ══════════

// ══════════ NGƯỜI 5 - TODO: thêm vùng của em ở đây ══════════

export function getAdminStats() {
  if (USE_MOCK) return getMock('admin-stats');
  return request(`${API_BASE}/admin/stats`);
}

export function listModels() {
  if (USE_MOCK) return getMockModels();
  return request(`${API_BASE}/admin/models`);
}

// Trạng thái mock của model (BR-1) được giữ trong localStorage để
// Activate/Archive/Upload phản ánh ngay trên list - cùng cách làm
// với getMockUsers (MOCK_USER_OVERRIDES_KEY).
const MOCK_MODEL_OVERRIDES_KEY = 'homeval_mock_model_overrides';
const MOCK_NEW_MODELS_KEY = 'homeval_mock_new_models';

function getMockModels() {
  return getMock('models').then(data => {
    const overrides = readMockStorage(MOCK_MODEL_OVERRIDES_KEY, {});
    const added = readMockStorage(MOCK_NEW_MODELS_KEY, []);
    const items = [
      ...data.items.map(m => ({ ...m, ...overrides[m.id] })),
      ...added.map(m => ({ ...m, ...overrides[m.id] })),
    ];
    return { ...data, items, total: items.length };
  });
}

function saveMockModelState(id, state) {
  const overrides = readMockStorage(MOCK_MODEL_OVERRIDES_KEY, {});
  overrides[id] = { ...overrides[id], state };
  localStorage.setItem(MOCK_MODEL_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function uploadModel({ file, algorithm, dataset, note }) {
  if (USE_MOCK) {
    const name = file?.name ?? '';
    if (!/\.pkl$|\.joblib$/i.test(name))
      return Promise.reject(new ApiError(422, 'file: Chỉ chấp nhận .pkl hoặc .joblib'));
    if ((file?.size ?? 0) > 100 * 1024 * 1024)
      return Promise.reject(new ApiError(422, 'file: File vượt quá 100 MB'));
    if (/bad/i.test(name))
      return Promise.reject(new ApiError(422, 'file: Smoke-test thất bại, version ở trạng thái Rejected'));
    const item = { id: `m-${Date.now()}`, version: 'v2.4.0-rc2', algorithm, dataset,
      mae: null, r2: null, upload_date: new Date().toISOString(),
      state: 'Uploaded', note: note ?? '' };
    const added = readMockStorage(MOCK_NEW_MODELS_KEY, []);
    added.push(item);
    localStorage.setItem(MOCK_NEW_MODELS_KEY, JSON.stringify(added));
    return Promise.resolve(item);
  }
  const form = new FormData();
  form.append('file', file);
  form.append('algorithm', algorithm);
  form.append('dataset', dataset);
  if (note) form.append('note', note);
  return request(`${API_BASE}/admin/models`, { method: 'POST', body: form });
}

export function activateModel(id) {
  if (USE_MOCK) {
    return getMockModels().then(data => {
      const target = data.items.find(m => String(m.id) === String(id));
      if (!target) throw new ApiError(404, 'Không tìm thấy phiên bản model.');
      // BR-1: Rejected không bao giờ được activate.
      if (target.state === 'Rejected')
        throw new ApiError(422, 'state: Phiên bản Rejected không thể kích hoạt.');
      // BR-2: đúng 1 Active - hạ bản đang live xuống Archived.
      for (const m of data.items) {
        if (m.state === 'Active' && String(m.id) !== String(id)) saveMockModelState(m.id, 'Archived');
      }
      saveMockModelState(target.id, 'Active');
      return { id: target.id, state: 'Active' };
    });
  }
  return request(`${API_BASE}/admin/models/${id}/activate`, { method: 'POST' });
}

export function archiveModel(id) {
  if (USE_MOCK) {
    return getMockModels().then(data => {
      const target = data.items.find(m => String(m.id) === String(id));
      if (!target) throw new ApiError(404, 'Không tìm thấy phiên bản model.');
      if (target.state === 'Rejected')
        throw new ApiError(422, 'state: Phiên bản Rejected không thể archive.');
      if (target.state === 'Archived') return { id: target.id, state: 'Archived' };
      saveMockModelState(target.id, 'Archived');
      return { id: target.id, state: 'Archived' };
    });
  }
  return request(`${API_BASE}/admin/models/${id}/archive`, { method: 'POST' });
}


// ---------- chỉ dùng ở chế độ mock; backend thật lọc bằng SQL ----------
function filterMock(data, { q = '', sort = 'newest', category = '',
                          min_price = '', max_price = '', page = 1, page_size = 0 }) {
  let items = data.items;
  if (q)         items = items.filter(i => i.title.toLowerCase().includes(q.toLowerCase()));
  if (category)  items = items.filter(i => i.category === category);
  if (min_price) items = items.filter(i => i.price >= Number(min_price));
  if (max_price) items = items.filter(i => i.price <= Number(max_price));

  if (sort === 'price_asc')  items = [...items].sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') items = [...items].sort((a, b) => b.price - a.price);
  if (sort === 'newest')     items = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const total = items.length;
  const size  = Number(page_size) || data.page_size || 20;
  const start = (Number(page) - 1) * size;
  return { items: items.slice(start, start + size), total, page: Number(page), page_size: size };
}

export function updateProfile(payload) {
  if (USE_MOCK) {
    const user = getUser();
    if (!user) return Promise.reject(new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.'));
    const updated = { ...user, ...payload };
    const overrides = readMockStorage(MOCK_USER_OVERRIDES_KEY, {});
    overrides[user.id] = { ...overrides[user.id], ...payload };
    localStorage.setItem(MOCK_USER_OVERRIDES_KEY, JSON.stringify(overrides));
    return Promise.resolve(updated);
  }
  return request(`${API_BASE}/me`, { method: 'PATCH', body: payload });
}

export function changePassword(payload) {
  if (USE_MOCK) {
    const user = getUser();
    const credentials = getMockCredentials();
    const email = user?.email?.toLowerCase();
    if (!email || credentials[email] !== payload.current_password)
      return Promise.reject(new ApiError(401, 'Mật khẩu hiện tại không đúng.'));
    credentials[email] = payload.new_password;
    localStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify(credentials));
    return Promise.resolve(null);
  }
  return request(`${API_BASE}/me/password`, { method: 'POST', body: payload });
}

function getMockCredentials() {
  return { ...MOCK_DEFAULT_CREDENTIALS, ...readMockStorage(MOCK_CREDENTIALS_KEY, {}) };
}

function getMockPredictionStore() {
  return readMockStorage(MOCK_PREDICTIONS_KEY, []);
}

function requireMockUser() {
  const user = getUser();
  if (!user) throw new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.');
  return user;
}
