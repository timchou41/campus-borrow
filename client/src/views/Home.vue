<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, auth } from '../store';

const router = useRouter();
const items = ref([]);
const categories = ref([]);
const search = ref('');
const category = ref('');
const loading = ref(true);

// 借用彈窗用的狀態
const borrowing = ref(null); // 正在借用的物品
const qty = ref(1);
const days = ref(3);
const modalError = ref('');
const okMsg = ref('');

async function load() {
  loading.value = true;
  const params = new URLSearchParams();
  if (search.value) params.set('search', search.value);
  if (category.value) params.set('category', category.value);
  items.value = await api(`/items?${params.toString()}`);
  loading.value = false;
}

onMounted(async () => {
  categories.value = await api('/categories');
  await load();
});

function openBorrow(item) {
  if (!auth.isLoggedIn) {
    router.push('/login');
    return;
  }
  borrowing.value = item;
  qty.value = 1;
  days.value = 3;
  modalError.value = '';
}

async function confirmBorrow() {
  modalError.value = '';
  try {
    await api('/loans', {
      method: 'POST',
      body: { item_id: borrowing.value.id, qty: qty.value, days: days.value }
    });
    okMsg.value = `已成功借用「${borrowing.value.name}」，請於 ${days.value} 天內歸還！`;
    borrowing.value = null;
    await load();
    setTimeout(() => (okMsg.value = ''), 4000);
  } catch (e) {
    modalError.value = e.message;
  }
}
</script>

<template>
  <h1 class="page-title">物品總覽</h1>
  <p class="page-sub">瀏覽校園可借用的物品，登入後即可線上借用。</p>

  <div v-if="okMsg" class="ok-msg">{{ okMsg }}</div>

  <div class="toolbar">
    <input v-model="search" placeholder="🔍 搜尋物品名稱或說明…" @keyup.enter="load" />
    <select v-model="category" @change="load">
      <option value="">全部分類</option>
      <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
    </select>
    <button class="btn" @click="load">搜尋</button>
  </div>

  <p v-if="loading" class="empty">載入中…</p>
  <p v-else-if="items.length === 0" class="empty">找不到符合條件的物品 😢</p>

  <div v-else class="grid">
    <div v-for="item in items" :key="item.id" class="card">
      <div class="item-emoji">{{ item.emoji }}</div>
      <span class="badge">{{ item.category }}</span>
      <div class="item-name">{{ item.name }}</div>
      <p class="item-desc">{{ item.description }}</p>
      <div class="stock" :class="{ out: item.available_qty === 0 }">
        可借：<strong>{{ item.available_qty }}</strong> / {{ item.total_qty }}
      </div>
      <button class="btn" :disabled="item.available_qty === 0" @click="openBorrow(item)">
        {{ item.available_qty === 0 ? '已借完' : '借用' }}
      </button>
    </div>
  </div>

  <!-- 借用彈窗 -->
  <div v-if="borrowing" class="modal-mask" @click.self="borrowing = null">
    <div class="modal">
      <h3>{{ borrowing.emoji }} 借用「{{ borrowing.name }}」</h3>
      <div v-if="modalError" class="error-msg">{{ modalError }}</div>
      <div class="field">
        <label>借用數量（可借 {{ borrowing.available_qty }}）</label>
        <input type="number" v-model.number="qty" min="1" :max="borrowing.available_qty" />
      </div>
      <div class="field">
        <label>借用天數</label>
        <select v-model.number="days">
          <option :value="1">1 天（當日歸還）</option>
          <option :value="3">3 天</option>
          <option :value="7">7 天（一週）</option>
          <option :value="14">14 天（兩週）</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn-outline btn" @click="borrowing = null">取消</button>
        <button class="btn" @click="confirmBorrow">確認借用</button>
      </div>
    </div>
  </div>
</template>
