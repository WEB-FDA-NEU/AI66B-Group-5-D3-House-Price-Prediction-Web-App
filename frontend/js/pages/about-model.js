import { loadCatalog, el, money, percent } from '../model-catalog.js';
try {
  const { items, dataset } = await loadCatalog(document.getElementById('model-catalog'));
  const strip = document.getElementById('dataset-strip'); strip.replaceChildren();
  for (const [value, label] of [[dataset.original_rows.toLocaleString('vi-VN'), 'bản ghi nguồn'], [dataset.cleaned_rows.toLocaleString('vi-VN'), 'bản ghi sau làm sạch'], [dataset.test_rows.toLocaleString('vi-VN'), 'mẫu kiểm tra độc lập'], ['2024', 'năm của dữ liệu rao bán']]) {
    const stat = el('div'); stat.append(el('strong', value), el('span', label)); strip.append(stat);
  }
  const table = el('table', null, 'model-table'); table.append(el('caption', 'Kết quả trên cùng tập kiểm tra. MAE / RMSE càng thấp càng tốt.'));
  const head = el('thead'); const row = el('tr'); ['Mô hình', 'MAE', 'RMSE', 'Sai số ≤ 20%', 'R²', 'Độ bao phủ khoảng giá'].forEach(t => row.append(el('th', t))); head.append(row); table.append(head);
  const body = el('tbody');
  for (const m of items) {
    const r = el('tr'); [m.name, money(m.metrics.mae_vnd), money(m.metrics.rmse_vnd), percent(m.metrics.within_20_percent), m.r2.toFixed(3), percent(m.metrics.interval_coverage_percent)].forEach(v => r.append(el('td', v))); body.append(r);
  }
  table.append(body); document.getElementById('comparison-table').append(table);
} catch { document.getElementById('dataset-strip').textContent = 'Chưa tải được kết quả kiểm định. Kiểm tra backend rồi tải lại trang.'; }
