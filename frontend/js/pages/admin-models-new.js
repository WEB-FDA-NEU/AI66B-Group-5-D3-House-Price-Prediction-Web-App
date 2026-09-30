import { requireAdmin } from '../auth.js';
import { listDatasets, startTraining, getTrainingJob } from '../api.js';
import { el } from '../model-catalog.js';
if (requireAdmin()) {
  const form = document.getElementById('training-form');
  const status = document.getElementById('training-status');
  const submit = form.querySelector('button[type=submit]');
  form.algorithm.addEventListener('change', () => {
    form.querySelectorAll('[data-config]').forEach(wrapper => { wrapper.hidden = wrapper.dataset.config !== form.algorithm.value; wrapper.querySelector('input').disabled = wrapper.hidden; });
  });
  try {
    const { items } = await listDatasets(); const d = items[0];
    const target = document.getElementById('dataset-info'); target.replaceChildren();
    [['Bản ghi nguồn', d.original_rows], ['Sau làm sạch', d.cleaned_rows], ['Đã loại', d.removed_rows], ['Huấn luyện / hiệu chỉnh / kiểm tra', `${d.train_rows} / ${d.calibration_rows} / ${d.test_rows}`]].forEach(([name, value]) => target.append(el('p', `${name}: ${value}`)));
    target.append(el('p', d.target, 'field__hint'));
    const details = el('details'); details.append(el('summary', 'Tỷ lệ thiếu dữ liệu theo đặc trưng'));
    const labels = {area_m2:'Diện tích', bedrooms:'Phòng ngủ', bathrooms:'Phòng tắm', floors:'Số tầng', frontage_m:'Mặt tiền', road_width_m:'Đường tiếp cận'};
    Object.entries(d.missing).forEach(([key, value]) => details.append(el('p', `${labels[key] || key}: ${(value * 100).toFixed(1)}%`))); target.append(details);
  } catch (error) { document.getElementById('dataset-info').textContent = error.detail || 'Không đọc được dataset.'; submit.disabled = true; }
  let timer;
  async function watch(id) {
    status.hidden = false; submit.disabled = true;
    try {
      const job = await getTrainingJob(id); status.dataset.status = job.status;
      if (job.status === 'completed') {
        status.replaceChildren(el('strong', 'Huấn luyện hoàn tất. Phiên bản mới chưa được phát hành.'), el('p', job.result.model_id));
        const link = el('a', 'Xem chỉ số & phát hành ↗', 'btn'); link.href = 'admin-models.html'; status.append(link);
        sessionStorage.removeItem('homeval_training_job'); submit.disabled = false;
      } else if (job.status === 'failed') {
        status.textContent = 'Huấn luyện thất bại: ' + job.error; sessionStorage.removeItem('homeval_training_job'); submit.disabled = false;
      } else { status.textContent = 'Đang huấn luyện và đánh giá. Bạn có thể rời trang rồi quay lại; phiên bản hiện tại vẫn hoạt động.'; timer = setTimeout(() => watch(id), 2500); }
    } catch (error) { status.replaceChildren(el('p', error.detail || 'Mất kết nối tới tác vụ.'));
      const retry = el('button', 'Kiểm tra lại', 'btn'); retry.onclick = () => watch(id); status.append(retry);
    }
  }
  const pending = sessionStorage.getItem('homeval_training_job'); if (pending) watch(pending);
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    submit.disabled = true; status.hidden = false; status.textContent = 'Đang tạo tác vụ…';
    const config = Object.fromEntries(new FormData(form)); for (const key of Object.keys(config)) if (key !== 'algorithm') config[key] = Number(config[key]);
    try { const job = await startTraining(config); sessionStorage.setItem('homeval_training_job', job.id); watch(job.id); }
    catch (error) { status.textContent = error.detail || 'Không tạo được tác vụ.'; submit.disabled = false; }
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
}
