import { createPrediction } from '../api.js';
import { clearFieldErrors, setFieldError, toast } from '../ui.js';

const form = document.getElementById('prediction-form');

form.addEventListener('submit', async event => {
  event.preventDefault();
  clearFieldErrors(form);

  let valid = true;
  for (const field of [form.district, form.property_type, form.area_m2, form.bedrooms, form.bathrooms, form.floors]) {
    if (!field.validity.valid) {
      setFieldError(field, 'Vui lòng nhập giá trị hợp lệ.');
      valid = false;
    }
  }
  if (Number(form.bathrooms.value) > Number(form.bedrooms.value) + 2) {
    setFieldError(form.bathrooms, 'Số phòng tắm không được vượt quá số phòng ngủ quá 2.');
    valid = false;
  }
  if (!valid) return;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const prediction = await createPrediction({
      district: form.district.value,
      property_type: form.property_type.value,
      area_m2: Number(form.area_m2.value),
      bedrooms: Number(form.bedrooms.value),
      bathrooms: Number(form.bathrooms.value),
      floors: Number(form.floors.value),
    });
    sessionStorage.setItem('homeval_prediction_draft', JSON.stringify(prediction));
    location.href = 'predict-result.html';
  } catch (error) {
    toast(error.detail ?? 'Không thể tạo dự đoán. Vui lòng thử lại.', 'error');
    button.disabled = false;
  }
});
