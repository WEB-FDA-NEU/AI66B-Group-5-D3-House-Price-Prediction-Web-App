// US-7 (#36): the 2-3 saved estimates picked for comparison. Kept in
// sessionStorage so the choice survives searching and paging the history.
export const MAX_COMPARE = 3;
const KEY = 'homeval_compare_ids';

export function readSelection() {
  try {
    const ids = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids.map(String).slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function writeSelection(ids) {
  try { sessionStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage disabled: selection lasts for this page only */ }
}

export const compareUrl = ids => `compare.html?ids=${ids.map(encodeURIComponent).join(',')}`;

/** Parse ?ids=a,b,c: trimmed, de-duplicated, capped. */
export function idsFromUrl(search = location.search) {
  const raw = new URLSearchParams(search).get('ids') ?? '';
  const ids = [...new Set(raw.split(',').map(id => id.trim()).filter(Boolean))];
  return { ids: ids.slice(0, MAX_COMPARE), dropped: Math.max(0, ids.length - MAX_COMPARE) };
}
