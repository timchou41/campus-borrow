<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { auth, logout } from './store';

const router = useRouter();
function onLogout() {
  logout();
  router.push('/login');
}
</script>

<template>
  <header class="navbar">
    <div class="nav-inner">
      <RouterLink to="/" class="brand">🏫 友善校園 · 物品借用</RouterLink>
      <nav class="nav-links">
        <RouterLink to="/">物品總覽</RouterLink>
        <RouterLink v-if="auth.isLoggedIn" to="/my-loans">我的借用</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/admin">後台管理</RouterLink>

        <template v-if="auth.isLoggedIn">
          <span class="user-tag">{{ auth.user.name }}<em v-if="auth.isAdmin">（管理員）</em></span>
          <button class="btn-ghost" @click="onLogout">登出</button>
        </template>
        <template v-else>
          <RouterLink to="/login">登入</RouterLink>
          <RouterLink to="/register" class="btn-primary-link">註冊</RouterLink>
        </template>
      </nav>
    </div>
  </header>

  <main class="container">
    <RouterView />
  </main>

  <footer class="footer">
    期末專題 · 友善校園物品借用系統 ｜ Express + SQLite + Vue 3
  </footer>
</template>
