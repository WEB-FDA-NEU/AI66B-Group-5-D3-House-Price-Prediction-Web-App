// ============================================================
//  Lưu token và cập nhật header cho đúng trạng thái đăng nhập.
//  LƯU Ý: token để trong localStorage sẽ đọc được nếu trang dính XSS.
//  Đó là lý do trong render.js ta luôn dùng textContent, không innerHTML.
// ============================================================
const TOKEN_KEY = 'app_token';
const USER_KEY  = 'app_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser  = () => JSON.parse(localStorage.getItem(USER_KEY) || 'null');
export const isLoggedIn = () => !!getToken();
export const getRole = () => getUser()?.role ?? 'guest';
export const isAdmin = () => getRole() === 'admin';

export function saveSession({ access_token, user }) {
  localStorage.setItem(TOKEN_KEY, access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.href = 'index.html';
}

/** Lưu trang hiện tại rồi chuyển sang Login — dùng cho "login branch" ở Mốc 1. */
export function requireLogin() {
  sessionStorage.setItem('app_return_to', location.pathname + location.search);
  location.href = 'login.html';
}

/** Sau khi đăng nhập xong thì quay lại đúng chỗ người dùng đang đứng. */
export function returnAfterLogin() {
  const back = sessionStorage.getItem('app_return_to') || 'index.html';
  sessionStorage.removeItem('app_return_to');
  location.href = back;
}

/** Chặn trang /admin/* khi không phải admin — dùng cho SY-3/BR-10.
 *  Chưa đăng nhập → login.html. Đăng nhập nhưng role != admin → 404.html
 *  để không lộ sự tồn tại của trang (đúng BR-10: 404 chứ không phải 403). */
export function requireAdmin() {
  if (!isLoggedIn()) {
    sessionStorage.setItem('app_return_to', location.pathname.split('/').pop() + location.search);
    location.href = 'login.html?next=admin';
    return false;
  }
  if (!isAdmin()) {
    location.href = '404.html';
    return false;
  }
  return true;
}

/** Đổi phần bên phải của header theo trạng thái đăng nhập. */
export function initHeader() {
  const guest = document.querySelector('[data-auth="guest"]');
  const user  = document.querySelector('[data-auth="user"]');
  const adminNav = document.querySelectorAll('[data-auth="admin"]');
  if (!guest || !user) return;              // trang này không có header → bỏ qua

  const logged = isLoggedIn();
  guest.hidden = logged;
  user.hidden  = !logged;
  adminNav.forEach(link => { link.hidden = !isAdmin(); });

  const nameEl = document.querySelector('[data-user-name]');
  if (nameEl && logged) nameEl.textContent = getUser()?.display_name ?? '';

  document.querySelector('[data-action="logout"]')?.addEventListener('click', e => {
    e.preventDefault();
    logout();
  });
}
