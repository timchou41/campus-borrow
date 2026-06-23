<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../store';

const items = ref([]);
const loans = ref([]);
const tab = ref('items');
const msg = ref('');
const error = ref('');

// 新增 / 編輯物品的表單
const editing = ref(null); // null=關閉, {}=新增, {id..}=編輯
const form = ref({ name: '', category: '', emoji: '📦', total_qty: 1, description: '' });

function fmt(s) {
  return s ? s.replace('T', ' ').slice(0, 16) : '—';
}

async function loadItems() {
  items.value = await api('/items');
}
async function loadLoans() {
  loans.value = await api('/loans');
}

function openCreate() {
  editing.value = {};
  form.value = { name: '', category: '其他', emoji: '📦', total_qty: 1, description: '' };
  error.value = '';
}
function openEdit(item) {
  editing.value = item;
  form.value = { ...item };
  error.value = '';
}

async function save() {
  error.value = '';
  try {
    if (editing.value.id) {
      await api(`/items/${editing.value.id}`, { method: 'PUT', body: form.value });
      msg.value = '已更新物品';
    } else {
      await api('/items', { method: 'POST', body: form.value });
      msg.value = '已新增物品';
    }
    editing.value = null;
    await loadItems();
    setTimeout(() => (msg.value = ''), 3000);
  } catch (e) {
    error.value = e.message;
  }
}

async function remove(item) {
  if (!confirm(`確定刪除「${item.name}」？`)) return;
  try {
    await api(`/items/${item.id}`, { method: 'DELETE' });
    msg.value = '已刪除物品';
    await loadItems();
    setTimeout(() => (msg.value = ''), 3000);
  } catch (e) {
    alert(e.message);
  }
}

async function forceReturn(loan) {
  if (!confirm(`代替使用者歸還「${loan.item_name}」？`)) return;
  await api(`/loans/${loan.id}/return`, { method: 'POST' });
  await Promise.all([loadLoans(), loadItems()]);
}

onMounted(() => {
  loadItems();
  loadLoans();
});
</script>

<template>
  <h1 class="page-title">後台管理</h1>
  <p class="page-sub">管理可借用物品與查看所有借用紀錄。</p>

  <div v-if="msg" class="ok-msg">{{ msg }}</div>

  <div class="toolbar">
    <button class="btn" :class="{ 'btn-outline': tab !== 'items' }" @click="tab = 'items'">物品管理</button>
    <button class="btn" :class="{ 'btn-outline': tab !== 'loans' }" @click="tab = 'loans'">借用紀錄</button>
  </div>

  <!-- ========== 物品管理 ========== -->
  <div v-if="tab === 'items'">
    <button class="btn" style="margin-bottom: 16px" @click="openCreate">＋ 新增物品</button>
    <table>
      <thead>
        <tr>
          <th>物品</th><th>分類</th><th>可借 / 總數</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>{{ it.emoji }} {{ it.name }}</td>
          <td>{{ it.category }}</td>
          <td>{{ it.available_qty }} / {{ it.total_qty }}</td>
          <td class="row-actions">
            <button class="btn btn-sm btn-outline" @click="openEdit(it)">編輯</button>
            <button class="btn btn-sm btn-danger" @click="remove(it)">刪除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ========== 借用紀錄 ========== -->
  <div v-else>
    <table>
      <thead>
        <tr>
          <th>借用人</th><th>物品</th><th>數量</th><th>借用時間</th><th>應還</th><th>狀態</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in loans" :key="l.id">
          <td>{{ l.borrower_name }}<br /><span class="hint">@{{ l.borrower_username }}</span></td>
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
            <button v-if="l.status === 'borrowed'" class="btn btn-sm" @click="forceReturn(l)">代為歸還</button>
            <span v-else class="hint">—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="loans.length === 0" class="empty">目前沒有任何借用紀錄</p>
  </div>

  <!-- ========== 新增 / 編輯彈窗 ========== -->
  <div v-if="editing" class="modal-mask" @click.self="editing = null">
    <div class="modal">
      <h3>{{ editing.id ? '編輯物品' : '新增物品' }}</h3>
      <div v-if="error" class="error-msg">{{ error }}</div>
      <div class="field">
        <label>物品名稱</label>
        <input v-model="form.name" placeholder="例如：雨傘" />
      </div>
      <div class="field">
        <label>分類</label>
        <input v-model="form.category" placeholder="例如：生活用品" />
      </div>
      <div class="field">
        <label>圖示 Emoji</label>
        <input v-model="form.emoji" placeholder="📦" maxlength="4" />
      </div>
      <div class="field">
        <label>總數量</label>
        <input type="number" v-model.number="form.total_qty" min="1" />
      </div>
      <div class="field">
        <label>說明</label>
        <textarea v-model="form.description" rows="3" placeholder="借用須知…"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" @click="editing = null">取消</button>
        <button class="btn" @click="save">儲存</button>
      </div>
    </div>
  </div>
</template>
