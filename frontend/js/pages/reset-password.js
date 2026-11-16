import { confirmPasswordReset } from '../api.js';
import { clearFieldErrors, setFieldError, showAlert } from '../ui.js';

const form = document.getElementById('reset-password-form');
const message = document.getElementById('reset-password-message');
const emailFromUrl = new URLSearchParams(location.search).get('email');
if (emailFromUrl) form.email.value = emailFromUrl;

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(form);
  message.hidden = true;
  let valid = true;
  if (!form.email.validity.valid) {
    setFieldError(form.email, 'Vui lòng nhập email hợp lệ.');
    valid = false;
  }
  if (!/^\d{6}$/.test(form.code.value)) {
    setFieldError(form.code, 'Mã đặt lại phải gồm đúng 6 chữ số.');
    valid = false;
  }
  if (form.new_password.value.length < 8) {
    setFieldError(form.new_password, 'Mật khẩu mới tối thiểu 8 ký tự.');
    valid = false;
  }
  if (form.new_password.value !== form.confirm_password.value) {
    setFieldError(form.confirm_password, 'Hai mật khẩu không khớp.');
    valid = false;
  }
  if (!valid) return;

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const result = await confirmPasswordReset({
      email: form.email.value.trim().toLowerCase(),
      code: form.code.value,
      new_password: form.new_password.value,
    });
    showAlert(message, result.message, {
      type: 'success',
      link: { href: 'login.html', text: 'Đăng nhập' },
    });
    message.hidden = false;
    form.reset();
  } catch (error) {
    showAlert(message, error.detail ?? 'Không thể đặt lại mật khẩu. Hãy kiểm tra mã và thử lại.');
    message.hidden = false;
  } finally {
    button.disabled = false;
  }
});
