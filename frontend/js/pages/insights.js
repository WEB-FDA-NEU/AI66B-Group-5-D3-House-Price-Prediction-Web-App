// GU-6 (#33): Market Insights — district medians, price per m², area and
// price-vs-area, all computed by /api/insights from the 2024 listing dataset.
import { getMarketInsights, getPropertyTypeUsage, ApiError } from '../api.js';
import { barChart, histogram, scatterChart, chartLoading, chartError } from '../charts.js';
import { billions, perM2, area, count, axisBillions, axisArea } from '../format.js';

const params = new URLSearchParams(location.search);
const select = document.getElementById('insights-city');
const summary = document.getElementById('insights-summary');
const charts = document.getElementById('insights-charts');
const source = document.getElementById('insights-source');
const disclaimer = document.getElementById('insights-disclaimer');
let notice = '';

const TITLES = {
  ppm2: 'Giá trung vị mỗi m² theo quận/huyện',
  price: 'Giá rao trung vị theo quận/huyện',
  ppm2Dist: 'Phân bố giá mỗi m²',
  areaDist: 'Phân bố diện tích',
  scatter: 'Giá rao so với diện tích',
  usage: 'Lượt định giá trên HomeVal theo loại hình',
};

function kpi(label, value, sub) {
  const card = document.createElement('div');
  card.className = 'kpi';
  for (const [cls, text] of [['kpi__label', label], ['kpi__value', value], ['kpi__sub', sub]]) {
    const p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    card.append(p);
  }
  return card;
}

function renderLoading() {
  // Keep the previous frame while refetching; only the first load shows placeholders.
  if (charts.childElementCount) { charts.classList.add('is-refreshing'); return; }
  charts.replaceChildren(...Object.values(TITLES).map(title => chartLoading({ title })));
}

function renderCities(data) {
  select.replaceChildren(...data.cities.map(c => {
    const option = document.createElement('option');
    option.value = c.city;
    option.textContent = `${c.city} (${count(c.count)} tin)`;
    option.selected = c.city === data.city;
    return option;
  }));
  select.disabled = data.cities.length < 2;
}

function districtDetails(d) {
  return [[count(d.count), 'tin rao'], [billions(d.median_price), 'giá trung vị'], [area(d.median_area_m2), 'diện tích trung vị']];
}

function render(data) {
  renderCities(data);
  const s = data.summary;
  summary.replaceChildren(
    kpi('Tin rao đã làm sạch', count(s.listings), `${count(s.districts)} quận/huyện đủ ${data.min_listings}+ tin`),
    kpi('Giá rao trung vị', billions(s.median_price), data.city),
    kpi('Giá trung vị mỗi m²', perM2(s.median_price_per_m2), 'giá ÷ diện tích từng tin'),
    kpi('Diện tích trung vị', area(s.median_area_m2), 'diện tích khai báo'),
  );
  const byPrice = [...data.district_stats].sort((a, b) => b.median_price - a.median_price);
  const scatter = data.price_vs_area;
  const figures = [
    barChart({
      title: TITLES.ppm2,
      description: `Quận/huyện có từ ${data.min_listings} tin trở lên, xếp từ cao xuống thấp. Trung vị ít bị kéo lệch bởi vài tin quá đắt.`,
      data: data.district_stats, label: d => d.district, value: 'median_price_per_m2', format: perM2,
      details: districtDetails, labelHeading: 'Quận/huyện', valueHeading: 'Giá trung vị/m²',
      emptyText: 'Chưa có quận/huyện nào đủ tin rao để so sánh.',
    }),
    barChart({
      title: TITLES.price,
      description: 'Giá của cả căn, nên phụ thuộc mạnh vào diện tích điển hình của từng khu vực.',
      data: byPrice, label: d => d.district, value: 'median_price', format: billions,
      details: d => [[count(d.count), 'tin rao'], [perM2(d.median_price_per_m2), 'giá trung vị/m²'], [area(d.median_area_m2), 'diện tích trung vị']],
      labelHeading: 'Quận/huyện', valueHeading: 'Giá rao trung vị',
      emptyText: 'Chưa có quận/huyện nào đủ tin rao để so sánh.',
    }),
    histogram({
      title: TITLES.ppm2Dist,
      description: 'Số tin rao trong từng khoảng giá mỗi m².',
      data: data.price_per_m2.bins, unit: data.price_per_m2.unit,
    }),
    histogram({
      title: TITLES.areaDist,
      description: 'Số tin rao trong từng khoảng diện tích.',
      data: data.area.bins, unit: data.area.unit,
    }),
    scatterChart({
      title: TITLES.scatter,
      description: `${count(scatter.shown)} trên ${count(scatter.total)} tin. ${scatter.note}`,
      data: scatter.points, x: 'area_m2', y: 'price', xFormat: axisArea, yFormat: axisBillions,
      xTipFormat: area, yTipFormat: billions,
      xLabel: 'Diện tích (m²)', yLabel: 'Giá rao', pointLabel: d => d.district,
      columns: [
        { label: 'Quận/huyện', value: d => d.district },
        { label: 'Diện tích', value: d => area(d.area_m2), numeric: true },
        { label: 'Giá rao', value: d => billions(d.price), numeric: true },
      ],
    }),
  ];
  figures[4].classList.add('insights-grid__wide');
  const usageSlot = chartLoading({ title: TITLES.usage });
  usageSlot.classList.add('insights-grid__wide');
  figures.push(usageSlot);
  loadUsage(data.city, usageSlot);
  charts.classList.remove('is-refreshing');
  charts.replaceChildren(...figures);
  const link = document.createElement('a');
  link.href = data.source_url;
  link.rel = 'noopener';
  link.target = '_blank';
  link.textContent = data.source;
  source.replaceChildren(...(notice ? [notice, ' · '] : []), 'Nguồn: ', link);
  notice = '';
  disclaimer.textContent = data.disclaimer;
}

// The dataset has no property-type column, so this chart counts the
// estimates people ran on HomeVal (our predictions table) instead.
// Loaded on its own so a failure here never hides the market charts.
async function loadUsage(city, slot) {
  let figure;
  try {
    const usage = await getPropertyTypeUsage({ city });
    figure = barChart({
      title: TITLES.usage,
      description: `${usage.note} Nguồn: ${usage.source}.`,
      data: usage.total ? usage.items : [],
      label: d => d.property_type, value: 'predictions', format: count,
      details: d => [[count(d.saved), 'đã được lưu']],
      labelHeading: 'Loại hình', valueHeading: 'Lượt định giá',
      columns: [
        { label: 'Loại hình', value: d => d.property_type },
        { label: 'Lượt định giá', value: d => count(d.predictions), numeric: true },
        { label: 'Đã lưu', value: d => count(d.saved), numeric: true },
      ],
      emptyText: `Chưa có lượt định giá nào cho ${city} trên HomeVal. Hãy thử định giá một tài sản.`,
    });
  } catch (error) {
    figure = chartError({ title: TITLES.usage, message: error.detail, onRetry: () => loadUsage(city, figure) });
  }
  figure.classList.add('insights-grid__wide');
  if (slot.isConnected) slot.replaceWith(figure);
}

async function load(city = '') {
  renderLoading();
  try {
    const data = await getMarketInsights({ city });
    render(data);
    const url = new URL(location.href);
    url.searchParams.set('city', data.city);
    history.replaceState(null, '', url);
  } catch (error) {
    charts.classList.remove('is-refreshing');
    if (error instanceof ApiError && error.status === 404 && city) {
      // Unknown or too-small city in the URL: fall back to the default view.
      notice = `${error.detail} Đang hiển thị tỉnh/thành mặc định.`;
      return load('');
    }
    summary.replaceChildren();
    charts.replaceChildren(chartError({
      title: 'Không tải được thống kê thị trường',
      message: error.detail ?? 'Vui lòng thử lại.',
      onRetry: () => { charts.replaceChildren(); load(city); },
    }));
  }
}

select.addEventListener('change', () => load(select.value));
document.getElementById('insights-filters').addEventListener('submit', event => event.preventDefault());
load(params.get('city') ?? '');
