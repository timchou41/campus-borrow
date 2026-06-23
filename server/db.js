// db.js — 建立並匯出 SQLite 資料庫連線，並初始化資料表
// 使用 Node.js 內建的 node:sqlite（免安裝、免編譯，需 Node 22.5 以上）
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const db = new DatabaseSync(path.join(__dirname, 'borrow.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---- 建立資料表 ----
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT UNIQUE NOT NULL,
  password  TEXT NOT NULL,          -- 以 salt:hash 形式儲存
  name      TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'user',  -- 'user' 或 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '其他',
  description TEXT DEFAULT '',
  emoji       TEXT DEFAULT '📦',
  total_qty   INTEGER NOT NULL DEFAULT 1,
  available_qty INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS loans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 1,
  borrowed_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  due_at      TEXT NOT NULL,
  returned_at TEXT,
  status      TEXT NOT NULL DEFAULT 'borrowed',  -- 'borrowed' 或 'returned'
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tokens (
  token   TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

// ---- 簡易交易包裝（node:sqlite 沒有 better-sqlite3 的 db.transaction）----
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ---- 密碼雜湊工具 (使用 Node 內建 crypto，無原生相依) ----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

module.exports = { db, transaction, hashPassword, verifyPassword };
// 友善校園物品借用系統 — 資料庫模組
