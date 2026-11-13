// GU-4 (#32): "which inputs moved this estimate" — shared by the result
// page and the saved-prediction detail page.
import { divergingBarChart } from '../charts.js';
import { signedBillions, billions } from '../format.js';

const show = (value, unit) => (value == null || value === '' ? 'Chưa có' : `${value}${unit ? ` ${unit}` : ''}`);

/**
 * @param {object} prediction  API prediction or saved record.
 * @returns {HTMLElement} a <section> ready to insert.
 */
export function renderExplanation(prediction) {
  const section = document.createElement('section');
  section.className = 'explanation stack';
  section.setAttribute('aria-labelledby', 'explanation-heading');
  const heading = document.createElement('h2');
  heading.id = 'explanation-heading';
  heading.textContent = 'Điều gì ảnh hưởng đến ước tính này?';
  section.append(heading);

  const explanation = prediction?.explanation;
  if (!explanation || !Array.isArray(explanation.items)) {
    const note = document.createElement('p');
    note.className = 'field__hint';
    note.textContent = prediction?.is_mock
      ? 'Kết quả minh họa này không có phần giải thích từ mô hình.'
      : 'Bản ghi này được tạo trước khi HomeVal lưu phần giải thích. Hãy tạo dự đoán mới để xem đặc điểm nào ảnh hưởng đến giá.';
    section.append(note);
    return section;
  }

  section.append(divergingBarChart({
    title: 'Tác động của từng đặc điểm so với một tài sản điển hình',
    description: `So với giá ước tính ${billions(prediction.estimated_price)}. ${explanation.method}`,
    data: explanation.items,
    label: item => `${item.label}: ${show(item.value, item.unit)}`,
    value: 'impact_vnd',
    format: signedBillions,
    positiveLabel: 'Làm giá cao hơn mức điển hình',
    negativeLabel: 'Làm giá thấp hơn mức điển hình',
    details: item => [
      [`${item.impact_percent > 0 ? '+' : ''}${String(item.impact_percent).replace('.', ',')}%`, 'so với giá ước tính'],
      [show(item.baseline, item.unit), 'mức điển hình'],
    ],
    columns: [
      { label: 'Đặc điểm', value: item => item.label },
      { label: 'Bạn nhập', value: item => show(item.value, item.unit) },
      { label: 'Mức điển hình', value: item => show(item.baseline, item.unit) },
      { label: 'Tác động', value: item => signedBillions(item.impact_vnd), numeric: true },
      { label: '% giá', value: item => `${String(item.impact_percent).replace('.', ',')}%`, numeric: true },
    ],
    emptyText: 'Không có đặc điểm nào để so sánh với mức điển hình.',
  }));

  if (explanation.not_provided?.length) {
    const missing = document.createElement('p');
    missing.className = 'field__hint';
    missing.textContent = `Chưa nhập nên mô hình dùng mức điển hình: ${explanation.not_provided.join(', ')}.`;
    section.append(missing);
  }
  const caveat = document.createElement('p');
  caveat.className = 'field__hint';
  caveat.textContent = 'Đây là giải thích của mô hình trên dữ liệu rao bán 2024, không phải nguyên nhân thực tế của giá thị trường.';
  section.append(caveat);
  return section;
}
