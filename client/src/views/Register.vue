<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { register, login } from '../store';

const router = useRouter();
const username = ref('');
const password = ref('');
const name = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await register(username.value, password.value, name.value);
    await login(username.value, password.value); // 註冊後自動登入
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
    <h2>註冊新帳號</h2>
    <div v-if="error" class="error-msg">{{ error }}</div>
    <form @submit.prevent="onSubmit">
      <div class="field">
        <label>姓名</label>
        <input v-model="name" placeholder="王小明" required />
      </div>
      <div class="field">
        <label>帳號</label>
        <input v-model="username" autocomplete="username" required />
      </div>
      <div class="field">
        <label>密碼</label>
        <input v-model="password" type="password" autocomplete="new-password" required />
      </div>
      <button class="btn" style="width: 100%" :disabled="loading">
        {{ loading ? '處理中…' : '註冊並登入' }}
      </button>
    </form>
    <p class="hint" style="margin-top: 16px">
      已經有帳號了？<RouterLink to="/login" style="color: var(--primary)">前往登入</RouterLink>
    </p>
  </div>
</template>
