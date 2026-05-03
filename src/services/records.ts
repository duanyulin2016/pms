import { PassportRecord } from '../types';

const API_BASE = '/api';

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API Error' }));
    throw new Error(error.message || '网络请求错误');
  }
  if (response.status === 204) return null;
  return response.json();
}

// Local polling instead of web sockets for simplicity in local deployment
export function subscribeToRecords(onUpdate: (records: PassportRecord[]) => void) {
  const fetchRecords = async () => {
    try {
      const data = await fetchAPI('/records');
      onUpdate(data);
    } catch (e: any) {
      if (e.message !== 'Failed to fetch' && String(e) !== 'TypeError: Failed to fetch') {
        console.error('Polling error:', e);
      }
    }
  };

  fetchRecords();
  const interval = setInterval(fetchRecords, 3000); // Poll every 3 seconds
  return () => clearInterval(interval);
}

export async function addRecord(record: PassportRecord) {
  return fetchAPI('/records', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function updateRecord(id: string, updates: Partial<PassportRecord>) {
  return fetchAPI(`/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteRecord(id: string) {
  return fetchAPI(`/records/${id}`, {
    method: 'DELETE',
  });
}
