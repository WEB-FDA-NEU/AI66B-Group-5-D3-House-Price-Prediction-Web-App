// Frontend demo support only. These public credentials are NOT real accounts.
export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || 'Đã có lỗi xảy ra.');
    this.status = status;
    this.detail = detail;
  }
}

const scenarios = new Map();
const errors = {
  validation: [422, 'Thông tin nhập chưa hợp lệ.'],
  unauthorized: [401, 'Bạn cần đăng nhập để tiếp tục.'],
  notFound: [404, 'Không tìm thấy nội dung bạn yêu cầu.'],
  quota: [429, 'Đã hết lượt dự báo. Vui lòng thử lại sau.'],
  server: [500, 'Dịch vụ tạm thời không khả dụng.'],
  network: [0, 'Không thể kết nối máy chủ. Hãy thử lại.'],
};

export function setMockScenario(operation, scenario = 'success') {
  if (!['success', 'empty', 'loading', ...Object.keys(errors)].includes(scenario)) {
    throw new Error(`Unknown mock scenario: ${scenario}`);
  }
  scenarios.set(operation, scenario);
}

export async function mockOperation(operation, run, emptyValue) {
  const query = new URLSearchParams(globalThis.location?.search || '');
  const scenario = scenarios.get(operation) ||
    (query.get('mockOperation') === operation ? query.get('mockScenario') : 'success');
  await new Promise(resolve => setTimeout(resolve, scenario === 'loading' ? 1200 : 0));
  if (errors[scenario]) throw new ApiError(...errors[scenario]);
  if (scenario === 'empty' && emptyValue !== undefined) return structuredClone(emptyValue);
  return run();
}

const demoAccounts = [
  { id: 'u-001', email: 'anh@example.com', display_name: 'Nguyễn Minh Anh', role: 'user', password: 'HomeVal123!' },
  { id: 'u-002', email: 'admin@homeval.vn', display_name: 'Quản trị viên', role: 'admin', password: 'Admin123!' },
];
const accountsKey = 'homeval_mock_accounts_v1';
function registeredAccounts() {
  try { return JSON.parse(localStorage.getItem(accountsKey) || '[]'); }
  catch { return []; }
}
const normalizeEmail = email => String(email || '').trim().toLowerCase();

async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

function session(account) {
  // Explicit allowlist: never expose credentials or their digest to page code.
  const { id, email, display_name, role } = account;
  return { access_token: `mock-${id}`, token_type: 'bearer', user: { id, email, display_name, role } };
}

export async function mockLogin(email, password) {
  const account = [...demoAccounts, ...registeredAccounts()]
    .find(user => user.email === normalizeEmail(email));
  const valid = account && (account.password
    ? account.password === password
    : account.digest === await digest(`${account.email}:${password}`));
  if (!valid) throw new ApiError(401, 'Email hoặc mật khẩu không đúng.');
  return session(account);
}

export async function mockRegister(payload) {
  const email = normalizeEmail(payload.email);
  const name = String(payload.display_name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || name.length > 80 ||
      !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(payload.password || '')) {
    throw new ApiError(422, 'Tên/email không hợp lệ; mật khẩu cần ít nhất 8 ký tự, có chữ và số.');
  }
  const accounts = registeredAccounts();
  if ([...demoAccounts, ...accounts].some(user => user.email === email)) {
    throw new ApiError(409, 'Email này đã được đăng ký.');
  }
  const account = { id: `demo-${crypto.randomUUID()}`, email, display_name: name, role: 'user',
    digest: await digest(`${email}:${payload.password}`) };
  localStorage.setItem(accountsKey, JSON.stringify([...accounts, account]));
  return session(account);
}

export function validatePrediction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(422, 'Thiếu thông tin căn nhà.');
  // Use the existing area_m2 name; additional BR-7 fields are documented in the contract.
  for (const field of ['area_m2', 'land_area_m2', 'floors']) {
    if (!Number.isFinite(input[field]) || input[field] <= 0) throw new ApiError(422, `${field}: phải lớn hơn 0.`);
  }
  for (const field of ['bedrooms', 'bathrooms', 'floors', 'year_built']) {
    if (!Number.isInteger(input[field]) || input[field] < 0) throw new ApiError(422, `${field}: cần số nguyên hợp lệ.`);
  }
  if (!Number.isFinite(input.frontage_m) || input.frontage_m <= 0 ||
      input.area_m2 > input.land_area_m2 * input.floors * 1.5 ||
      input.bathrooms > input.bedrooms + 2 || input.year_built < 1800 ||
      input.year_built > new Date().getFullYear()) throw new ApiError(422, 'Thông tin căn nhà vi phạm BR-7.');
  for (const field of ['city', 'district', 'property_type', 'legal_status']) {
    if (typeof input[field] !== 'string' || !input[field].trim()) throw new ApiError(422, `${field}: không được để trống.`);
  }
}
