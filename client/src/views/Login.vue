<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../store';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await login(username.value, password.value);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-box card">
    <h2>登入</h2>
    <div v-if="error" class="error-msg">{{ error }}</div>
    <form @submit.prevent="onSubmit">
      <div class="field">
        <label>帳號</label>
        <input v-model="username" autocomplete="username" required />
      </div>
      <div class="field">
        <label>密碼</label>
        <input v-model="password" type="password" autocomplete="current-password" required />
      </div>
      <button class="btn" style="width: 100%" :disabled="loading">
        {{ loading ? '登入中…' : '登入' }}
      </button>
    </form>
    <p class="hint" style="margin-top: 16px">
      還沒有帳號？<RouterLink to="/register" style="color: var(--primary)">立即註冊</RouterLink><br />
      測試帳號：<code>admin / admin123</code>（管理員）、<code>student / student123</code>
    </p>
  </div>
</template>
