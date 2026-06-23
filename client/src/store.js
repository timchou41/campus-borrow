// store.js — 共用的登入狀態與 API 呼叫工具
import { reactive } from 'vue';

// 從 localStorage 還原登入狀態
const saved = JSON.parse(localStorage.getItem('auth') || 'null');

export const auth = reactive({
  token: saved?.token || null,
  user: saved?.user || null,
  get isLoggedIn() {
    return !!this.token;
  },
  get isAdmin() {
    return this.user?.role === 'admin';
  }
});

function persist() {
  if (auth.token) {
    localStorage.setItem('auth', JSON.stringify({ token: auth.token, user: auth.user }));
  } else {
    localStorage.removeItem('auth');
  }
}

// 統一的 fetch 包裝：自動帶上 token、自動解析錯誤訊息
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // token 失效 → 自動登出
    if (res.status === 401) logout();
    throw new Error(data.error || `請求失敗 (${res.status})`);
  }
  return data;
}

export async function login(username, password) {
  const data = await api('/auth/login', { method: 'POST', body: { username, password } });
  auth.token = data.token;
  auth.user = data.user;
  persist();
  return data;
}

export async function register(username, password, name) {
  return api('/auth/register', { method: 'POST', body: { username, password, name } });
}

export function logout() {
  if (auth.token) api('/auth/logout', { method: 'POST' }).catch(() => {});
  auth.token = null;
  auth.user = null;
  persist();
}
