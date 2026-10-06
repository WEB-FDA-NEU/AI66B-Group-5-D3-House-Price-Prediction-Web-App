// Live API. Serve with `python backend/run.py` at http://127.0.0.1:8000.
// Only known static preview ports use the default backend at 8000.
// Pages served by FastAPI use their own origin, including a custom PORT.
export const USE_MOCK = false;
export const API_BASE = ['localhost', '127.0.0.1'].includes(location.hostname) && ['4173', '5500'].includes(location.port)
  ? `${location.protocol}//${location.hostname}:8000/api` : '/api';
export const MOCK_BASE = 'mock';
export const PAGE_SIZE = 20;
