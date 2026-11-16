import { requestPasswordReset } from '../api.js';
import { clearFieldErrors, setFieldError, showAlert } from '../ui.js';

const form = document.getElementById('forgot-password-form');
const message = document.getElementById('reset-request-message');
const demoCode = document.getElementById('demo-reset-code');

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(form);
  message.hidden = true;
  demoCode.hidden = true;
  if (!form.email.validity.valid) {
    setFieldError(form.email, 'Vui lòng nhập email hợp lệ.');
    return;
  }

  const button = form.querySelector('button[type=submit]');
  button.disabled = true;
  try {
    const result = await requestPasswordReset(form.email.value.trim().toLowerCase());
    message.textContent = result.message;
    message.hidden = false;
    if (result.demo && result.demo_code) {
      document.getElementById('demo-reset-code-value').textContent = result.demo_code;
      document.getElementById('open-reset-form').href =
        `reset-password.html?email=${encodeURIComponent(form.email.value.trim().toLowerCase())}`;
      demoCode.hidden = false;
    }
  } catch (error) {
    showAlert(message, error.detail ?? 'Không thể yêu cầu đặt lại mật khẩu. Hãy thử lại.', { type: 'error' });
    message.hidden = false;
  } finally {
    button.disabled = false;
  }
});
