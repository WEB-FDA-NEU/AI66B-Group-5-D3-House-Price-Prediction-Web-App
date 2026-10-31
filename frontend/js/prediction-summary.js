// Older locally saved records can lack intervals; disclose that rather than
// inventing an interval or silently displaying a bare price.
export function intervalText(prediction) {
  const interval = prediction.confidence_interval;
  if (!interval || !Number.isFinite(interval.lower) || !Number.isFinite(interval.upper)) {
    return 'Khoảng ước tính chưa được lưu trong bản ghi cũ này. Hãy tạo dự đoán mới để xem đầy đủ.';
  }
  const format = value => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: prediction.currency || 'VND', maximumFractionDigits: 0,
  }).format(value);
  return `Khoảng ước tính: ${format(interval.lower)} – ${format(interval.upper)}`;
}

export const predictionDisclaimer = 'Ước tính chỉ mang tính tham khảo, không thay thế định giá chuyên nghiệp.';

export function hasCompletePrediction(prediction) {
  const interval = prediction?.confidence_interval;
  const model = prediction?.model;
  return Number.isFinite(prediction?.estimated_price) && prediction.estimated_price > 0
    && Number.isFinite(interval?.lower) && Number.isFinite(interval?.upper)
    && interval.lower >= 0 && interval.lower <= interval.upper
    && typeof model?.version === 'string' && model.version.trim().length > 0
    && typeof model?.algorithm === 'string' && model.algorithm.trim().length > 0
    && prediction.input !== null && typeof prediction.input === 'object'
    && !Array.isArray(prediction.input);
}
