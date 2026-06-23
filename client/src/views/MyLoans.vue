<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '../store';

const loans = ref([]);
const loading = ref(true);
const msg = ref('');

function fmt(s) {
  if (!s) return '—';
  return s.replace('T', ' ').slice(0, 16);
}

async function load() {
  loading.value = true;
  loans.value = await api('/loans/my');
  loading.value = false;
}

async function returnItem(loan) {
  if (!confirm(`確定要歸還「${loan.item_name}」嗎？`)) return;
  await api(`/loans/${loan.id}/return`, { method: 'POST' });
  msg.value = `已歸還「${loan.item_name}」，謝謝你！`;
  await load();
  setTimeout(() => (msg.value = ''), 4000);
}

const activeCount = computed(() => loans.value.filter((l) => l.status === 'borrowed').length);
const overdueCount = computed(() => loans.value.filter((l) => l.overdue).length);

onMounted(load);
</script>

<template>
  <h1 class="page-title">我的借用</h1>
  <p class="page-sub">
    目前借用中 <strong>{{ activeCount }}</strong> 件
    <span v-if="overdueCount" style="color: var(--danger)">（含 {{ overdueCount }} 件已逾期）</span>
  </p>

  <div v-if="msg" class="ok-msg">{{ msg }}</div>

  <p v-if="loading" class="empty">載入中…</p>
  <p v-else-if="loans.length === 0" class="empty">你還沒有任何借用紀錄，快去借點東西吧！</p>

  <table v-else>
    <thead>
      <tr>
        <th>物品</th>
        <th>數量</th>
        <th>借用時間</th>
        <th>應還日期</th>
        <th>狀態</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="l in loans" :key="l.id">
        <td>{{ l.item_emoji }} {{ l.item_name }}</td>
        <td>{{ l.qty }}</td>
        <td>{{ fmt(l.borrowed_at) }}</td>
        <td>{{ fmt(l.due_at) }}</td>
        <td>
          <span v-if="l.status === 'returned'" class="tag-state tag-returned">已歸還</span>
          <span v-else-if="l.overdue" class="tag-state tag-overdue">已逾期</span>
          <span v-else class="tag-state tag-borrowed">借用中</span>
        </td>
        <td>
          <button v-if="l.status === 'borrowed'" class="btn btn-sm" @click="returnItem(l)">歸還</button>
          <span v-else class="hint">{{ fmt(l.returned_at) }} 已還</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
