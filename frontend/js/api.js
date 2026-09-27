// ============================================================
//  Tầng DUY NHẤT được phép gọi mạng.
//  Không file nào khác được viết fetch().
//
//  CHIA VÙNG THEO NGƯỜI để tránh conflict Git — mỗi người chỉ
//  thêm hàm vào vùng của mình.
// ============================================================
import { USE_MOCK, API_BASE, MOCK_BASE } from './config.js';
import { getToken } from './auth.js';

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
    res = await fetch(url, { ...options, headers });
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
  return request(`${MOCK_BASE}/${name}.json`);
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

// ══════════ NGƯỜI 1 — danh sách & chi tiết ══════════
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

// ══════════ NGƯỜI 2 — tài khoản ══════════

export function login(email, password) {
  if (USE_MOCK) {
    if (password === 'sai') return Promise.reject(new ApiError(401, 'Email hoặc mật khẩu không đúng.'));
    // Mock role admin cho Milestone 2: email chứa "admin" → role admin.
    // Mốc 3 backend sẽ trả role thật từ JWT.
    const isAdminMail = (email || '').toLowerCase().includes('admin');
    return Promise.resolve({
      access_token: isAdminMail ? 'mock-admin-token' : 'mock-token', token_type: 'bearer',
      user: isAdminMail
        ? { id: 99, display_name: 'Quản trị viên', role: 'admin', email }
        : { id: 1, display_name: 'Người dùng mẫu', role: 'user', email },
    });
  }
  return request(`${API_BASE}/auth/login`, { method: 'POST', body: { email, password } });
}

export function register(payload) {
  if (USE_MOCK)
    return Promise.resolve({ access_token: 'mock-token',
                             user: { id: 2, display_name: payload.display_name, role: 'user' } });
  return request(`${API_BASE}/auth/register`, { method: 'POST', body: payload });
}

// ══════════ NGƯỜI 3 — Trang chủ & Giới thiệu mô hình (Hải): GU-1/GU-5 mock ══════════

export function getModelInfo() {
  if (USE_MOCK) return request(`${MOCK_BASE}/model.json`);
  return request(`${API_BASE}/model`);
}

// HomeVal prediction, history and market-insight contract.

export function createPrediction(input) {
  if (USE_MOCK) {
    return getMock('prediction-result').then(result => ({
      ...result,
      input: { ...result.input, ...input },
      is_mock: true,
    }));
  }
  return request(`${API_BASE}/predictions`, { method: 'POST', body: input });
}

export function getPredictionHistory({ q = '', page = 1, pageSize = 10 } = {}) {
  if (USE_MOCK) {
    return getMock('prediction-history').then(data => {
      const keyword = q.trim().toLowerCase();
      const items = keyword
        ? data.items.filter(item => Object.values(item).some(value =>
            String(value).toLowerCase().includes(keyword)))
        : data.items;
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
      const item = data.items.find(entry => String(entry.id) === String(id));
      if (!item) throw new ApiError(404, 'Không tìm thấy dự báo này.');
      return item;
    });
  }
  return request(`${API_BASE}/me/predictions/${encodeURIComponent(id)}`);
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
    return getMock('users').then(data => {
      const keyword = q.trim().toLowerCase();
      const items = keyword
        ? data.items.filter(user => [user.display_name, user.email, user.role]
            .some(value => value.toLowerCase().includes(keyword)))
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

// ══════════ NGƯỜI 4 — TODO: thêm vùng của em ở đây ══════════

// ══════════ NGƯỜI 5 — Admin (Tuệ): AD-1..AD-4 mock, không cần backend ══════════
// Hợp đồng mock trùng FastAPI Mốc 3. BR-1/BR-2/BR-13 chỉ mô phỏng phía UI.

export function getAdminStats() {
  if (USE_MOCK) return request(`${MOCK_BASE}/admin-stats.json`);
  return request(`${API_BASE}/admin/stats`);
}

export function listModels() {
  if (USE_MOCK) return request(`${MOCK_BASE}/models.json`);
  return request(`${API_BASE}/admin/models`);
}

export function uploadModel({ file, algorithm, dataset, note }) {
  if (USE_MOCK) {
    // Mô phỏng BR-13 phía browser: sai loại file / quá 100MB / smoke-test fail.
    const name = file?.name ?? '';
    if (!/\.pkl$|\.joblib$/i.test(name))
      return Promise.reject(new ApiError(422, 'file: Chỉ chấp nhận .pkl hoặc .joblib'));
    if ((file?.size ?? 0) > 100 * 1024 * 1024)
      return Promise.reject(new ApiError(422, 'file: File vượt quá 100 MB'));
    if (/bad/i.test(name))
      return Promise.reject(new ApiError(422, 'file: Smoke-test thất bại, version ở trạng thái Rejected'));
    return Promise.resolve({
      id: 'm-new', version: 'v2.4.0-rc2', algorithm, dataset,
      state: 'Uploaded', note: note ?? '',
    });
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('algorithm', algorithm);
  fd.append('dataset', dataset);
  if (note) fd.append('note', note);
  return request(`${API_BASE}/admin/models`, { method: 'POST', body: fd });
}

export function activateModel(id) {
  if (USE_MOCK) {
    // Mô phỏng BR-2 conflict: version khác vừa live thì báo 409 + refresh list.
    if (Math.random() < 0.0)
      return Promise.reject(new ApiError(409, 'Phiên bản khác vừa được kích hoạt. Danh sách đã làm mới.'));
    return Promise.resolve({ id, state: 'Active' });
  }
  return request(`${API_BASE}/admin/models/${id}/activate`, { method: 'POST' });
}

export function archiveModel(id) {
  if (USE_MOCK) return Promise.resolve({ id, state: 'Archived' });
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
