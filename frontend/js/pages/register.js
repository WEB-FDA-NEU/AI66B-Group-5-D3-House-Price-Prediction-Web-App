import { register } from '../api.js';
import { saveSession, returnAfterLogin } from '../auth.js';
import { setFieldError, clearFieldErrors, toast } from '../ui.js';

const form = document.getElementById('register-form');
const strength = document.getElementById('password-strength');

function updatePasswordStrength() {
  const password = form.password.value;
  if (!password) {
    strength.textContent = 'Độ mạnh mật khẩu: chưa nhập';
    return;
  }
  const hasLetters = /[a-z]/i.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = /[^a-z\d]/i.test(password);
  const level = password.length >= 12 && hasLetters && hasDigits && hasSymbols
    ? 'mạnh'
    : password.length >= 8 && hasLetters && hasDigits
      ? 'trung bình'
      : 'yếu';
  strength.textContent = `Độ mạnh mật khẩu: ${level}`;
}

form.password.addEventListener('input', updatePasswordStrength);

form.addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldErrors(form);

  let ok = true;
  if (form.display_name.value.trim().length < 2) { setFieldError(form.display_name, 'Tên tối thiểu 2 ký tự.'); ok = false; }
  if (!form.email.validity.valid)                { setFieldError(form.email, 'Email không hợp lệ.'); ok = false; }
  if (form.password.value.length < 8)            { setFieldError(form.password, 'Mật khẩu tối thiểu 8 ký tự.'); ok = false; }
  if (form.password.value !== form.confirm.value){ setFieldError(form.confirm, 'Hai mật khẩu không khớp.'); ok = false; }
  if (!form.terms.checked)                       { setFieldError(form.terms, 'Bạn cần đồng ý để tiếp tục.'); ok = false; }
  if (!ok) return;

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Đang tạo tài khoản…';
  try {
    const session = await register({
      display_name: form.display_name.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      phone: form.phone.value.trim(),
    });
    saveSession(session);          // đăng ký xong đăng nhập luôn, không bắt qua Login
    returnAfterLogin();
  } catch (err) {
    if (err.status === 409) setFieldError(form.email, err.detail);   // email trùng
    else toast(err.detail ?? 'Đăng ký thất bại.', 'error');
    btn.disabled = false;
    btn.textContent = 'Đăng ký';
  }
});
