// seed.js — 建立預設帳號與範例物品資料
// 執行方式： node seed.js
const { db, hashPassword } = require('./db');

console.log('🌱 開始建立種子資料...');

// 清空舊資料 (重新 seed 時)
db.exec('DELETE FROM loans; DELETE FROM tokens; DELETE FROM items; DELETE FROM users;');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('loans','items','users');");

// ---- 預設使用者 ----
const insertUser = db.prepare(
  'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)'
);
insertUser.run('admin', hashPassword('admin123'), '系統管理員', 'admin');
insertUser.run('student', hashPassword('student123'), '王小明', 'user');

// ---- 範例物品 ----
const items = [
  ['雨傘', '生活用品', '突然下雨臨時借用，請於當日歸還。', '☂️', 20, 20],
  ['行動電源', '3C設備', '10000mAh 含 Type-C / Lightning 線。', '🔋', 8, 8],
  ['HDMI 轉接線', '3C設備', '筆電接投影機簡報用。', '🔌', 10, 10],
  ['桌球拍', '運動器材', '附桌球 3 顆，限校內球桌使用。', '🏓', 6, 6],
  ['籃球', '運動器材', '標準 7 號球，請勿帶出校外。', '🏀', 5, 5],
  ['計算機', '文具', '工程用計算機，考試請自備。', '🧮', 12, 12],
  ['延長線', '生活用品', '3 公尺六孔延長線。', '🧯', 7, 7],
  ['急救箱', '生活用品', '含 OK 繃、消毒棉片等。', '🩹', 3, 3],
  ['投影筆', '3C設備', '簡報雷射筆，附電池。', '🔦', 4, 4],
  ['桌遊-狼人殺', '休閒娛樂', '午休時段教室內使用。', '🎲', 2, 2]
];

const insertItem = db.prepare(
  'INSERT INTO items (name, category, description, emoji, total_qty, available_qty) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const it of items) insertItem.run(...it);

console.log(`✅ 已建立 2 位使用者與 ${items.length} 項物品`);
console.log('   管理員帳號： admin / admin123');
console.log('   學生帳號：   student / student123');
