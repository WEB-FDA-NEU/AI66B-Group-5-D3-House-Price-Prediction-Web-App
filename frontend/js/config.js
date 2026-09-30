// Live API. Serve with `python backend/run.py` at http://127.0.0.1:8000.
// Local static previews (4173 / Live Server 5500) connect to the same backend.
export const USE_MOCK = false;
export const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '8000'
  ? `${location.protocol}//${location.hostname}:8000/api` : '/api';
export const MOCK_BASE = 'mock';
export const PAGE_SIZE = 20;
