// ============================================================
//  Trang hồ sơ: sửa thông tin + đổi mật khẩu.
//  Yêu cầu đăng nhập — chưa đăng nhập thì đẩy sang Login,
//  quay lại đúng trang này sau khi đăng nhập xong (F10, F12).
// ============================================================
import { updateProfile, changePassword, ApiError } from '../api.js';
import { isLoggedIn, requireLogin, getUser, saveSession, getToken } from '../auth.js';
import { setFieldError, clearFieldErrors, toast } from '../ui.js';
import '../components/site-header.js';
import '../components/site-footer.js';

if (!isLoggedIn()) requireLogin();

const profileForm  = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');

// Đổ dữ liệu hiện tại lên form
const me = getUser();
if (me) {
  profileForm.display_name.value = me.display_name ?? '';
  profileForm.phone.value = me.phone ?? '';
}

// ---------- Sửa thông tin ----------
profileForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldErrors(profileForm);

  if (profileForm.display_name.value.trim().length < 2) {
    setFieldError(profileForm.display_name, 'Tên tối thiểu 2 ký tự.');
    return;
  }

  const btn = profileForm.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const user = await updateProfile({
      display_name: profileForm.display_name.value.trim(),
      phone: profileForm.phone.value.trim(),
    });
    // Cập nhật lại session để header hiện đúng tên mới ngay lập tức
    saveSession({ access_token: getToken(), user });
    toast('Đã lưu thông tin.');
  } catch (err) {
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
    toast('Đã đổi mật khẩu. Vui lòng đăng nhập lại lần sau bằng mật khẩu mới.');
    passwordForm.reset();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401)
      setFieldError(passwordForm.current_password, err.detail);
    else
      toast(err.detail ?? 'Không đổi được mật khẩu.', 'error');
  } finally {
    btn.disabled = false;
  }
});