import { User, UserActionLog } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

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

export async function getLogs(): Promise<UserActionLog[]> {
  return fetchAPI('/logs');
}

export async function addLog(log: Omit<UserActionLog, 'id' | 'timestamp'>) {
  return fetchAPI('/logs', {
    method: 'POST',
    body: JSON.stringify(log),
  });
}

export async function getUsers(): Promise<User[]> {
  return fetchAPI('/users');
}

export async function updateUser(id: string, updates: Partial<User>) {
  return fetchAPI(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(id: string) {
  return fetchAPI(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function registerUser(user: Omit<User, 'id' | 'status'>) {
  return fetchAPI('/users/register', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function loginUser(username: string, password?: string): Promise<User> {
  return fetchAPI('/users/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Local API Error [${operationType}] at ${path}:`, error);
  throw error;
}
