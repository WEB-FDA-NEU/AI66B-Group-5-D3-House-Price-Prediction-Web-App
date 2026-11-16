// ============================================================
//  Trang hồ sơ: sửa thông tin + đổi mật khẩu.
//  Yêu cầu đăng nhập - chưa đăng nhập thì đẩy sang Login,
//  quay lại đúng trang này sau khi đăng nhập xong (F10, F12).
// ============================================================
import { updateProfile, changePassword, getProfileStats, deleteAccount, ApiError } from '../api.js';
import { isLoggedIn, requireLogin, getUser, saveSession, getToken, clearSession, expireSession } from '../auth.js';
import { setFieldError, clearFieldErrors, confirmAction, toast } from '../ui.js';
import '../components/site-header.js';
import '../components/site-footer.js';

if (!isLoggedIn()) requireLogin();

const profileForm  = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const deleteForm = document.getElementById('delete-account-form');
const deletePanel = document.getElementById('delete-account-panel');
if (getUser()?.role === 'admin') deletePanel.hidden = true;

// Đổ dữ liệu hiện tại lên form
const me = getUser();
if (me) {
  profileForm.display_name.value = me.display_name ?? '';
  profileForm.email.value = me.email ?? '';
  profileForm.phone.value = me.phone ?? '';
}

getProfileStats().then(stats => {
  document.getElementById('saved-prediction-count').textContent =
    new Intl.NumberFormat('vi-VN').format(stats.saved_predictions);
  const memberSince = new Date(stats.member_since);
  document.getElementById('member-since').dateTime = memberSince.toISOString();
  document.getElementById('member-since').textContent =
    new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(memberSince);
}).catch(error => {
  if (error.status === 401) { expireSession(); requireLogin(); return; }
  toast(error.detail ?? 'Không tải được thống kê tài khoản.', 'error');
});

// ---------- Sửa thông tin ----------
profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldErrors(profileForm);

  if (profileForm.display_name.value.trim().length < 2) {
    setFieldError(profileForm.display_name, 'Tên tối thiểu 2 ký tự.');
    return;
  }
  if (!profileForm.email.validity.valid) {
    setFieldError(profileForm.email, 'Vui lòng nhập email hợp lệ.');
    return;
  }

  const btn = profileForm.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const user = await updateProfile({
      display_name: profileForm.display_name.value.trim(),
      email: profileForm.email.value.trim().toLowerCase(),
      phone: profileForm.phone.value.trim(),
    });
    // Cập nhật lại session để header hiện đúng tên mới ngay lập tức
    saveSession({ access_token: getToken(), user });
    toast('Đã lưu thông tin.');
  } catch (err) {
    if (err.status === 401) { expireSession(); requireLogin(); return; }
    toast(err.detail ?? 'Không lưu được thông tin.', 'error');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Đổi mật khẩu ----------
passwordForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldErrors(passwordForm);

  let ok = true;
  if (passwordForm.new_password.value.length < 8) {
    setFieldError(passwordForm.new_password, 'Mật khẩu mới tối thiểu 8 ký tự.'); ok = false;
  }
  if (passwordForm.new_password.value !== passwordForm.confirm_password.value) {
    setFieldError(passwordForm.confirm_password, 'Hai mật khẩu không khớp.'); ok = false;
  }
  if (!ok) return;

  const btn = passwordForm.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    await changePassword({
      current_password: passwordForm.current_password.value,
      new_password: passwordForm.new_password.value,
    });

    deleteForm.addEventListener('submit', async event => {
      event.preventDefault();
      clearFieldErrors(deleteForm);
      if (deleteForm.confirmation.value.trim() !== 'DELETE') {
        setFieldError(deleteForm.confirmation, 'Hãy nhập chính xác DELETE để tiếp tục.');
        return;
      }
      const approved = await confirmAction({
        title: 'Xóa tài khoản và dữ liệu?',
        message: 'Tài khoản cùng toàn bộ dự đoán đã lưu và dữ liệu liên quan sẽ bị xóa vĩnh viễn.',
        confirmText: 'Xóa tài khoản',
      });
      if (!approved) return;

      const button = deleteForm.querySelector('button[type=submit]');
      button.disabled = true;
      try {
        await deleteAccount('DELETE');
        clearSession();
        toast('Tài khoản và dữ liệu đã được xóa.');
        location.href = 'index.html';
      } catch (error) {
        if (error.status === 401) { expireSession(); requireLogin(); return; }
        button.disabled = false;
        toast(error.detail ?? 'Không thể xóa tài khoản.', 'error');
      }
    });
    toast('Đã đổi mật khẩu. Vui lòng đăng nhập lại lần sau bằng mật khẩu mới.');
    passwordForm.reset();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && err.detail === 'Mật khẩu hiện tại không đúng.')
      setFieldError(passwordForm.current_password, err.detail);
    else if (err.status === 401) { expireSession(); requireLogin(); }
    else
      toast(err.detail ?? 'Không đổi được mật khẩu.', 'error');
  } finally {
    btn.disabled = false;
  }
});