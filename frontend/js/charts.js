// ============================================================
//  FE-06 (#3): reusable, dependency-free charts.
//
//  Every function takes a plain data object and RETURNS a <figure>; nothing
//  here looks up a DOM id. Each figure carries:
//    - a title + description wired to the graphic for screen readers,
//    - a hover/focus tooltip (enhances, never gates),
//    - a "Xem dạng bảng" table with every plotted value,
//    - an explicit empty / invalid-data state instead of a broken chart.
//  All labels are inserted with textContent: chart data is untrusted.
//  Colours come from css/charts.css (validated: band, chroma, contrast, CVD).
// ============================================================

const SVG_NS = 'http://www.w3.org/2000/svg';
let figureSeq = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const isNumber = value => typeof value === 'number' && Number.isFinite(value);

/** Shared frame: title, description, body, table and state handling. */
function frame({ title, description, className = '' }) {
  const id = `viz-${++figureSeq}`;
  const figure = el('figure', `viz ${className}`.trim());
  const caption = el('figcaption', 'viz__title', title);
  caption.id = `${id}-title`;
  figure.append(caption);
  if (description) {
    const desc = el('p', 'viz__desc', description);
    desc.id = `${id}-desc`;
    figure.append(desc);
  }
  const body = el('div', 'viz__body');
  figure.append(body);
  const label = { 'aria-labelledby': caption.id };
  if (description) label['aria-describedby'] = `${id}-desc`;
  return { figure, body, id, label };
}

function stateMessage(body, message, kind) {
  const box = el('p', `viz__state viz__state--${kind}`, message);
  box.setAttribute('role', kind === 'invalid' ? 'alert' : 'status');
  body.replaceChildren(box);
}

/**
 * Validate before drawing. Returns null when the data can be drawn, or a
 * figure already showing the empty / invalid state.
 */
function guard(rows, fields, opts) {
  if (Array.isArray(rows) && rows.length && rows.every(row => fields.every(f => isNumber(row?.[f])))) return null;
  const { figure, body } = frame(opts);
  if (!Array.isArray(rows) || !rows.length) stateMessage(body, opts.emptyText ?? 'Chưa có dữ liệu để vẽ biểu đồ.', 'empty');
  else stateMessage(body, 'Dữ liệu biểu đồ không hợp lệ nên không thể hiển thị.', 'invalid');
  return figure;
}

/** Loading placeholder with the same frame, so the layout does not jump. */
export function chartLoading({ title, description, text = 'Đang tải biểu đồ…' } = {}) {
  const { figure, body } = frame({ title, description });
  figure.setAttribute('aria-busy', 'true');
  stateMessage(body, text, 'loading');
  return figure;
}

/** Error placeholder with an optional retry button. */
export function chartError({ title, description, message, onRetry } = {}) {
  const { figure, body } = frame({ title, description });
  stateMessage(body, message || 'Không tải được dữ liệu biểu đồ.', 'invalid');
  if (onRetry) {
    const retry = el('button', 'btn', 'Thử lại');
    retry.type = 'button';
    retry.addEventListener('click', onRetry);
    body.append(retry);
  }
  return figure;
}

function tableView(columns, rows) {
  const details = el('details', 'viz__table');
  details.append(el('summary', null, 'Xem dạng bảng'));
  const wrap = el('div', 'viz__table-wrap');
  const table = el('table', 'table');
  const head = el('tr');
  for (const column of columns) {
    const th = el('th', null, column.label);
    th.scope = 'col';
    head.append(th);
  }
  const thead = el('thead'); thead.append(head);
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const column of columns) tr.append(el('td', column.numeric ? 'num' : null, column.value(row)));
    tbody.append(tr);
  }
  table.append(thead, tbody);
  wrap.append(table);
  details.append(wrap);
  return details;
}

/** One tooltip per figure. Values lead, labels follow. */
function tooltip(figure) {
  const tip = el('div', 'viz__tooltip');
  tip.setAttribute('role', 'status');
  tip.hidden = true;
  figure.append(tip);
  return {
    show(anchor, lines, event) {
      tip.replaceChildren(...lines.map(([value, label], index) => {
        const row = el('div', 'viz__tooltip-row');
        row.append(el(index === 0 ? 'strong' : 'span', null, value));
        if (label) row.append(el('span', 'viz__tooltip-label', label));
        return row;
      }));
      tip.hidden = false;
      const box = figure.getBoundingClientRect();
      const point = event?.clientX != null ? { x: event.clientX, y: event.clientY }
        : (() => { const r = anchor.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; })();
      const width = tip.offsetWidth;
      const left = Math.min(Math.max(8, point.x - box.left + 12), box.width - width - 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${Math.max(0, point.y - box.top - tip.offsetHeight - 12)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

function bindTip(tip, target, lines) {
  target.addEventListener('pointermove', event => tip.show(target, lines(), event));
  target.addEventListener('pointerleave', () => tip.hide());
  target.addEventListener('focus', () => tip.show(target, lines()));
  target.addEventListener('blur', () => tip.hide());
}

/**
 * Horizontal bars from a zero baseline (magnitude comparison).
 * @param {{title:string, description?:string, data:object[], label:(d)=>string,
 *   value:string, format:(n)=>string, details?:(d)=>Array<[string,string]>,
 *   highlight?:(d)=>boolean, columns?:object[], emptyText?:string}} opts
 */
export function barChart(opts) {
  const { data, label, value, format, details, highlight } = opts;
  const failed = guard(data, [value], opts);
  if (failed) return failed;
  const { figure, body, label: aria } = frame({ ...opts, className: 'viz--bars' });
  const max = Math.max(...data.map(d => d[value]), 0) || 1;
  const list = el('div', 'viz-bars');
  list.setAttribute('role', 'list');
  for (const [key, val] of Object.entries(aria)) list.setAttribute(key, val);
  const tip = tooltip(figure);
  for (const datum of data) {
    const row = el('div', 'viz-bars__row' + (highlight?.(datum) ? ' is-highlighted' : ''));
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${label(datum)}: ${format(datum[value])}`);
    const name = el('span', 'viz-bars__label', label(datum));
    const track = el('span', 'viz-bars__track');
    const bar = el('span', 'viz-bars__bar');
    bar.style.width = `${Math.max(0, datum[value]) / max * 100}%`;
    if (datum[value] <= 0) bar.hidden = true;  // a zero must not look like a small value
    track.append(bar);
    row.append(name, track, el('span', 'viz-bars__value', format(datum[value])));
    bindTip(tip, row, () => [[format(datum[value]), label(datum)], ...(details?.(datum) ?? [])]);
    list.append(row);
  }
  body.append(list);
  figure.append(tableView(opts.columns ?? [
    { label: opts.labelHeading ?? 'Nhóm', value: label },
    { label: opts.valueHeading ?? 'Giá trị', value: d => format(d[value]), numeric: true },
  ], data));
  return figure;
}

/**
 * Diverging bars around a neutral centre (polarity: raises vs lowers).
 * Sign is also carried by the +/− text and the legend, never colour alone.
 */
export function divergingBarChart(opts) {
  const { data, label, value, format, details, positiveLabel, negativeLabel } = opts;
  const failed = guard(data, [value], opts);
  if (failed) return failed;
  const { figure, body, label: aria } = frame({ ...opts, className: 'viz--diverging' });
  const legend = el('div', 'viz__legend');
  for (const [cls, text] of [['up', positiveLabel], ['down', negativeLabel]]) {
    const item = el('span', 'viz__legend-item');
    item.append(el('span', `viz__swatch viz__swatch--${cls}`), document.createTextNode(text));
    legend.append(item);
  }
  body.append(legend);
  const max = Math.max(...data.map(d => Math.abs(d[value])), 0) || 1;
  const list = el('div', 'viz-diverging');
  list.setAttribute('role', 'list');
  for (const [key, val] of Object.entries(aria)) list.setAttribute(key, val);
  const tip = tooltip(figure);
  for (const datum of data) {
    const amount = datum[value];
    const direction = amount > 0 ? 'up' : amount < 0 ? 'down' : 'zero';
    const row = el('div', `viz-diverging__row is-${direction}`);
    row.setAttribute('role', 'listitem');
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${label(datum)}: ${format(amount)}`);
    const neg = el('span', 'viz-diverging__half viz-diverging__half--neg');
    const pos = el('span', 'viz-diverging__half viz-diverging__half--pos');
    const bar = el('span', 'viz-diverging__bar');
    bar.style.width = `${Math.abs(amount) / max * 100}%`;
    (amount < 0 ? neg : pos).append(bar);
    row.append(el('span', 'viz-diverging__label', label(datum)), neg, pos, el('span', 'viz-diverging__value', format(amount)));
    bindTip(tip, row, () => [[format(amount), label(datum)], ...(details?.(datum) ?? [])]);
    list.append(row);
  }
  body.append(list);
  figure.append(tableView(opts.columns ?? [
    { label: 'Đặc điểm', value: label },
    { label: 'Tác động', value: d => format(d[value]), numeric: true },
  ], data));
  return figure;
}

/** Vertical columns for binned distributions. */
export function histogram(opts) {
  const { data, value = 'count', label = d => d.range, format = n => n.toLocaleString('vi-VN'), unit } = opts;
  const failed = guard(data, [value], opts);
  if (failed) return failed;
  const { figure, body, label: aria } = frame({ ...opts, className: 'viz--histogram' });
  const total = data.reduce((sum, d) => sum + d[value], 0) || 1;
  const max = Math.max(...data.map(d => d[value]), 0) || 1;
  const plot = el('div', 'viz-columns');
  plot.setAttribute('role', 'list');
  for (const [key, val] of Object.entries(aria)) plot.setAttribute(key, val);
  const tip = tooltip(figure);
  for (const datum of data) {
    const share = datum[value] / total * 100;
    const col = el('div', 'viz-columns__col');
    col.setAttribute('role', 'listitem');
    col.tabIndex = 0;
    col.setAttribute('aria-label', `${label(datum)}${unit ? ' ' + unit : ''}: ${format(datum[value])} (${share.toFixed(1)}%)`);
    const area = el('div', 'viz-columns__area');
    const bar = el('div', 'viz-columns__bar');
    bar.style.height = `${datum[value] / max * 100}%`;
    bar.append(el('span', 'viz-columns__value', format(datum[value])));
    area.append(bar);
    col.append(area, el('span', 'viz-columns__label', label(datum)));
    bindTip(tip, col, () => [[format(datum[value]), `${label(datum)}${unit ? ' ' + unit : ''}`], [`${share.toFixed(1)}%`, 'tổng số tin']]);
    plot.append(col);
  }
  body.append(plot);
  if (unit) body.append(el('p', 'viz__axis-title', unit));
  figure.append(tableView([
    { label: opts.labelHeading ?? `Khoảng${unit ? ` (${unit})` : ''}`, value: label },
    { label: opts.valueHeading ?? 'Số tin', value: d => format(d[value]), numeric: true },
    { label: 'Tỷ lệ', value: d => `${(d[value] / total * 100).toFixed(1)}%`, numeric: true },
  ], data));
  return figure;
}

function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const power = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * power).find(s => span / s <= count) ?? power * 10;
  // The last tick is the first one AT OR ABOVE max, so every mark stays inside the plot.
  const ticks = [];
  const end = Math.ceil(max / step - 1e-9) * step;
  for (let t = Math.floor(min / step) * step; t <= end + 1e-9; t += step) ticks.push(+t.toFixed(10));
  return ticks;
}

/**
 * Scatter (relationship between two measures). Rendered at the container's
 * real width so labels stay legible on phones; re-rendered on resize.
 */
export function scatterChart(opts) {
  const { data, x, y, xFormat, yFormat, xLabel, yLabel, pointLabel } = opts;
  const tipX = opts.xTipFormat ?? xFormat; const tipY = opts.yTipFormat ?? yFormat;
  const failed = guard(data, [x, y], opts);
  if (failed) return failed;
  const { figure, body, label: aria } = frame({ ...opts, className: 'viz--scatter' });
  const holder = el('div', 'viz-scatter');
  body.append(holder);
  const tip = tooltip(figure);
  const xs = data.map(d => d[x]); const ys = data.map(d => d[y]);
  const xTicks = niceTicks(0, Math.max(...xs));
  const yTicks = niceTicks(0, Math.max(...ys));
  const xMax = xTicks.at(-1) || 1; const yMax = yTicks.at(-1) || 1;

  function draw() {
    const width = Math.max(280, holder.clientWidth || 640);
    const height = Math.round(Math.min(380, Math.max(240, width * 0.55)));
    const m = { top: 12, right: 16, bottom: 44, left: 64 };
    const w = width - m.left - m.right; const h = height - m.top - m.bottom;
    const sx = v => m.left + v / xMax * w; const sy = v => m.top + h - v / yMax * h;
    const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', ...aria });
    const grid = svg('g', { class: 'viz-grid' });
    for (const t of yTicks) {
      grid.append(svg('line', { x1: m.left, x2: m.left + w, y1: sy(t), y2: sy(t) }));
      const text = svg('text', { x: m.left - 8, y: sy(t), 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'viz-tick' });
      text.textContent = yFormat(t); grid.append(text);
    }
    const tickEvery = Math.ceil(xTicks.length / Math.max(2, Math.floor(w / 70)));
    xTicks.forEach((t, index) => {
      if (index % tickEvery) return;
      const text = svg('text', { x: sx(t), y: m.top + h + 18, 'text-anchor': 'middle', class: 'viz-tick' });
      text.textContent = xFormat(t); grid.append(text);
    });
    grid.append(svg('line', { x1: m.left, x2: m.left + w, y1: m.top + h, y2: m.top + h, class: 'viz-baseline' }));
    const xt = svg('text', { x: m.left + w / 2, y: height - 6, 'text-anchor': 'middle', class: 'viz-axis-label' });
    xt.textContent = xLabel;
    const yt = svg('text', { x: 12, y: m.top + h / 2, 'text-anchor': 'middle', class: 'viz-axis-label', transform: `rotate(-90 12 ${m.top + h / 2})` });
    yt.textContent = yLabel;
    root.append(grid, xt, yt);
    const dots = svg('g', { class: 'viz-dots' });
    const positions = data.map(d => [sx(d[x]), sy(d[y])]);
    positions.forEach(([cx, cy]) => dots.append(svg('circle', { cx, cy, r: 4 })));
    root.append(dots);
    const focus = svg('circle', { r: 6, class: 'viz-dot-focus', visibility: 'hidden' });
    root.append(focus);
    // Nearest-point hit layer: the pointer only has to be closest, not on the dot.
    const hit = svg('rect', { x: m.left, y: m.top, width: w, height: h, fill: 'transparent' });
    hit.addEventListener('pointermove', event => {
      const box = root.getBoundingClientRect();
      const px = event.clientX - box.left; const py = event.clientY - box.top;
      let best = -1; let bestDist = Infinity;
      positions.forEach(([cx, cy], i) => { const dist = (cx - px) ** 2 + (cy - py) ** 2; if (dist < bestDist) { bestDist = dist; best = i; } });
      if (best < 0 || bestDist > 40 ** 2) { focus.setAttribute('visibility', 'hidden'); tip.hide(); return; }
      const datum = data[best];
      focus.setAttribute('cx', positions[best][0]); focus.setAttribute('cy', positions[best][1]);
      focus.setAttribute('visibility', 'visible');
      tip.show(hit, [[tipY(datum[y]), yLabel], [tipX(datum[x]), xLabel], ...(pointLabel ? [[pointLabel(datum), '']] : [])], event);
    });
    hit.addEventListener('pointerleave', () => { focus.setAttribute('visibility', 'hidden'); tip.hide(); });
    root.append(hit);
    holder.replaceChildren(root);
  }

  let lastWidth = 0;
  const observer = new ResizeObserver(entries => {
    const width = Math.round(entries[0].contentRect.width);
    if (width && width !== lastWidth) { lastWidth = width; draw(); }
  });
  observer.observe(holder);
  draw();
  figure.append(tableView(opts.columns ?? [
    ...(pointLabel ? [{ label: 'Nhóm', value: pointLabel }] : []),
    { label: xLabel, value: d => tipX(d[x]), numeric: true },
    { label: yLabel, value: d => tipY(d[y]), numeric: true },
  ], data));
  return figure;
}
