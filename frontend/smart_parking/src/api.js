// ============================================================
// SPTRM – Centralised API helper
// ============================================================
const BASE = '/api';

function headers() {
  const token = localStorage.getItem('sptrm_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login        : (body) => request('POST', '/auth/login', body),
  register     : (body) => request('POST', '/auth/register', body),

  // Parking
  dashboard    : ()     => request('GET',  '/parking/dashboard'),
  slots        : (q)    => request('GET',  `/parking/slots${q ? '?'+new URLSearchParams(q) : ''}`),
  chargers     : ()     => request('GET',  '/parking/chargers'),

  // Reservations
  book         : (body) => request('POST', '/reservations/book', body),
  myBookings   : ()     => request('GET',  '/reservations/my'),
  cancel       : (id)   => request('POST', `/reservations/cancel/${id}`),
  confirm      : (id)   => request('POST', `/reservations/confirm/${id}`),
  startSession : (body) => request('POST', '/reservations/start-session', body),
  endSession   : (body) => request('POST', '/reservations/end-session', body),
  activeRes    : ()     => request('GET',  '/reservations/active'),

  // Scheduler
  fcfs         : ()     => request('GET',  '/scheduler/fcfs'),
  priority     : ()     => request('GET',  '/scheduler/priority'),
  roundRobin   : (q)    => request('GET',  `/scheduler/round-robin${q ? '?'+new URLSearchParams(q) : ''}`),
  compare      : ()     => request('GET',  '/scheduler/compare'),
  performance  : ()     => request('GET',  '/scheduler/performance'),
  rag          : ()     => request('GET',  '/scheduler/rag'),
  simulateDL   : ()     => request('POST', '/scheduler/rag/simulate'),

  // Admin
  adminUsers   : ()     => request('GET',  '/admin/users'),
  adminPayments: ()     => request('GET',  '/admin/payments'),
  adminAllRes  : ()     => request('GET',  '/admin/all-reservations'),
  updateSlot   : (id, body) => request('PATCH', `/admin/slots/${id}`, body),
};
