import { requireAdmin } from '../auth.js';
import { uploadModel, ApiError } from '../api.js';
import { setFieldError, clearFieldErrors, toast } from '../ui.js';

if (!requireAdmin()) throw new Error('blocked');

const form = document.getElementById('upload-form');

form.addEventListener('submit', async e => {
  e.preventDefault();
  clearFieldErrors(form);
  let ok = true;
  const file = form.file.files[0];
  if (!file) { setFieldError(form.file, 'Hãy chọn file model.'); ok = false; }
  else if (!/\.pkl$|\.joblib$/i.test(file.name)) { setFieldError(form.file, 'Chỉ chấp nhận .pkl hoặc .joblib (BR-13).'); ok = false; }
  else if (file.size > 100 * 1024 * 1024) { setFieldError(form.file, 'File vượt quá 100 MB (BR-13).'); ok = false; }
  if (!form.algorithm.value) { setFieldError(form.algorithm, 'Hãy chọn thuật toán.'); ok = false; }
  if (!form.dataset.value) { setFieldError(form.dataset, 'Hãy chọn dataset.'); ok = false; }
  if (!ok) return;

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Đang smoke-test…';
  try {
    const res = await uploadModel({ file, algorithm: form.algorithm.value, dataset: form.dataset.value, note: form.note.value });
    toast(`Upload thành công, state: ${res.state}`, 'success');
    location.href = 'admin-models.html';
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) setFieldError(form.file, err.detail);
    else toast(err.detail ?? 'Upload thất bại.', 'error');
    btn.disabled = false;
    btn.textContent = 'Upload & Smoke-test';
  }
});
