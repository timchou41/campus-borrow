// index.js — Express API 伺服器 (僅提供 API，前端由 Vite 另外啟動)
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { db, transaction, hashPassword, verifyPassword } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 簡易請求紀錄
app.use((req, _res, next) => {
  console.log(`${new Date().toLocaleTimeString()}  ${req.method} ${req.url}`);
  next();
});

// ---------- 工具：依登入 token 取得使用者 ----------
function getUserFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return null;
  const row = db.prepare('SELECT user_id FROM tokens WHERE token = ?').get(token);
  if (!row) return null;
  return db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(row.user_id);
}

// 需要登入
function requireAuth(req, res, next) {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: '請先登入' });
  req.user = user;
  next();
}

// 需要管理員
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '需要管理員權限' });
  next();
}

// 將逾期的借用標記出來 (回傳時動態計算)
function withOverdue(loan) {
  const overdue = loan.status === 'borrowed' && new Date(loan.due_at) < new Date();
  return { ...loan, overdue };
}

// ==================================================
//  認證 Auth
// ==================================================

// 註冊
app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body || {};
  if (!username || !password || !name)
    return res.status(400).json({ error: '帳號、密碼、姓名皆為必填' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '此帳號已被註冊' });

  const info = db
    .prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .run(username, hashPassword(password), name, 'user');

  res.status(201).json({ id: info.lastInsertRowid, username, name, role: 'user' });
});

// 登入
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password))
    return res.status(401).json({ error: '帳號或密碼錯誤' });

  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO tokens (token, user_id) VALUES (?, ?)').run(token, user.id);

  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role }
  });
});

// 取得目前登入者
app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// 登出
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  db.prepare('DELETE FROM tokens WHERE token = ?').run(token);
  res.json({ ok: true });
});

// ==================================================
//  物品 Items
// ==================================================

// 分類清單
app.get('/api/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM items ORDER BY category').all();
  res.json(rows.map((r) => r.category));
});

// 物品清單 (可關鍵字搜尋 / 分類篩選)
app.get('/api/items', (req, res) => {
  const { search = '', category = '' } = req.query;
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

// 單一物品
app.get('/api/items/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '找不到物品' });
  res.json(item);
});

// 新增物品 (管理員)
app.post('/api/items', requireAuth, requireAdmin, (req, res) => {
  const { name, category = '其他', description = '', emoji = '📦', total_qty = 1 } = req.body || {};
  if (!name) return res.status(400).json({ error: '物品名稱必填' });
  const qty = Math.max(1, parseInt(total_qty) || 1);
  const info = db
    .prepare(
      'INSERT INTO items (name, category, description, emoji, total_qty, available_qty) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name, category, description, emoji, qty, qty);
  res.status(201).json(db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid));
});

// 編輯物品 (管理員)
app.put('/api/items/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: '找不到物品' });

  const { name, category, description, emoji, total_qty } = req.body || {};
  const borrowed = item.total_qty - item.available_qty; // 已借出數量不可被改掉
  const newTotal = total_qty != null ? Math.max(borrowed, parseInt(total_qty) || borrowed) : item.total_qty;

  db.prepare(
    `UPDATE items SET name = ?, category = ?, description = ?, emoji = ?, total_qty = ?, available_qty = ? WHERE id = ?`
  ).run(
    name ?? item.name,
    category ?? item.category,
    description ?? item.description,
    emoji ?? item.emoji,
    newTotal,
    newTotal - borrowed,
    item.id
  );
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(item.id));
});

// 刪除物品 (管理員) — 仍有未歸還借用時不可刪
app.delete('/api/items/:id', requireAuth, requireAdmin, (req, res) => {
  const active = db
    .prepare("SELECT COUNT(*) c FROM loans WHERE item_id = ? AND status = 'borrowed'")
    .get(req.params.id);
  if (active.c > 0) return res.status(400).json({ error: '尚有未歸還的借用，無法刪除' });
  db.prepare('DELETE FROM loans WHERE item_id = ?').run(req.params.id);
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ==================================================
//  借用 Loans
// ==================================================

// 借用物品
app.post('/api/loans', requireAuth, (req, res) => {
  const { item_id, qty = 1, days = 3 } = req.body || {};
  const n = Math.max(1, parseInt(qty) || 1);
  const borrowDays = Math.max(1, parseInt(days) || 3);

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: '找不到物品' });
  if (item.available_qty < n) return res.status(400).json({ error: '可借數量不足' });

  const id = transaction(() => {
    db.prepare('UPDATE items SET available_qty = available_qty - ? WHERE id = ?').run(n, item.id);
    const info = db
      .prepare(
        `INSERT INTO loans (item_id, user_id, qty, due_at)
         VALUES (?, ?, ?, datetime('now','localtime','+' || ? || ' days'))`
      )
      .run(item.id, req.user.id, n, borrowDays);
    return info.lastInsertRowid;
  });
  res.status(201).json(db.prepare('SELECT * FROM loans WHERE id = ?').get(id));
});

// 我的借用紀錄
app.get('/api/loans/my', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, i.name AS item_name, i.emoji AS item_emoji, i.category AS item_category
       FROM loans l JOIN items i ON i.id = l.item_id
       WHERE l.user_id = ? ORDER BY l.id DESC`
    )
    .all(req.user.id);
  res.json(rows.map(withOverdue));
});

// 所有借用紀錄 (管理員)
app.get('/api/loans', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, i.name AS item_name, i.emoji AS item_emoji,
              u.name AS borrower_name, u.username AS borrower_username
       FROM loans l
       JOIN items i ON i.id = l.item_id
       JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC`
    )
    .all();
  res.json(rows.map(withOverdue));
});

// 歸還 (本人或管理員)
app.post('/api/loans/:id/return', requireAuth, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: '找不到借用紀錄' });
  if (loan.status === 'returned') return res.status(400).json({ error: '此筆已歸還' });
  if (loan.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: '只能歸還自己的借用' });

  transaction(() => {
    db.prepare(
      "UPDATE loans SET status = 'returned', returned_at = datetime('now','localtime') WHERE id = ?"
    ).run(loan.id);
    db.prepare('UPDATE items SET available_qty = available_qty + ? WHERE id = ?').run(
      loan.qty,
      loan.item_id
    );
  });
  res.json(db.prepare('SELECT * FROM loans WHERE id = ?').get(loan.id));
});

// ---------- 健康檢查 ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🚀 API 伺服器已啟動： http://localhost:${PORT}`);
});
