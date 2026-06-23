import { createRouter, createWebHistory } from 'vue-router';
import { auth } from './store';

import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import MyLoans from './views/MyLoans.vue';
import Admin from './views/Admin.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/my-loans', component: MyLoans, meta: { auth: true } },
  { path: '/admin', component: Admin, meta: { admin: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守衛：需要登入 / 需要管理員
router.beforeEach((to) => {
  if (to.meta.auth && !auth.isLoggedIn) return '/login';
  if (to.meta.admin && !auth.isAdmin) return '/';
  return true;
});

export default router;
