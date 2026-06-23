# 友善校園 · 物品借用系統 🏫

期末專題 — 校園資訊網站。讓全校師生線上查詢、借用與歸還校園公用物品（雨傘、行動電源、運動器材等），並提供管理員後台維護物品與追蹤借用紀錄。

> **技術組成**：Express（後端 API）＋ Node 內建 `node:sqlite`（資料庫）＋ Vue 3 + Vite（前端）。全程只用 HTML / CSS / JavaScript。

---

## ✨ 功能

- **物品總覽與搜尋**：依名稱／說明關鍵字搜尋、依分類篩選，即時顯示可借數量。
- **借用與歸還流程**：選擇數量與借用天數，自動計算應還日期；歸還後自動回補庫存。
- **借用紀錄與逾期提醒**：「我的借用」可看借用中／已歸還／已逾期狀態。
- **使用者登入與管理員角色**：一般使用者借東西；管理員可新增／編輯／刪除物品、查看全校借用紀錄、代為歸還。

---

## 📁 專案結構

```
campus-borrow/
├── server/                 # 後端 (Express API only)
│   ├── index.js            # API 路由
│   ├── db.js               # 資料庫連線與建表 (node:sqlite)
│   ├── seed.js             # 建立預設帳號與範例物品
│   └── package.json
├── client/                 # 前端 (Vue 3 + Vite)
│   ├── index.html
│   ├── vite.config.js      # 設定 /api 代理到後端
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router.js       # 前端路由與權限守衛
│       ├── store.js        # 登入狀態 + fetch 包裝
│       ├── style.css
│       └── views/          # Home / Login / Register / MyLoans / Admin
└── README.md
```

---

## 🚀 安裝與啟動

> **環境需求**：Node.js **22.5 以上**（使用內建 `node:sqlite`，免安裝、免編譯資料庫套件）。
> 確認版本：`node -v`

需要開**兩個終端機**，分別啟動後端與前端。

### 1️⃣ 後端（Express API，預設 http://localhost:3000）

```bash
cd server
npm install          # 只會安裝 express 與 cors
npm run seed         # 建立資料庫並寫入預設帳號 / 範例物品（第一次必跑）
npm start            # 啟動 API 伺服器
```

### 2️⃣ 前端（Vue + Vite，預設 http://localhost:5173）

```bash
cd client
npm install
npm run dev          # 啟動開發伺服器
```

開啟瀏覽器進入 **http://localhost:5173** 即可使用。
（前端的 `/api` 請求會透過 Vite 代理自動轉送到後端 3000 埠。）

### 預設測試帳號

| 角色 | 帳號 | 密碼 |
| --- | --- | --- |
| 管理員 | `admin` | `admin123` |
| 一般學生 | `student` | `student123` |

也可以在登入頁點「立即註冊」自行建立新帳號。

---

## 🔌 API 一覽

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 公開 | 註冊 |
| POST | `/api/auth/login` | 公開 | 登入，回傳 token |
| GET | `/api/auth/me` | 登入 | 取得目前使用者 |
| POST | `/api/auth/logout` | 登入 | 登出 |
| GET | `/api/categories` | 公開 | 分類清單 |
| GET | `/api/items?search=&category=` | 公開 | 物品清單（可搜尋／篩選） |
| GET | `/api/items/:id` | 公開 | 單一物品 |
| POST | `/api/items` | 管理員 | 新增物品 |
| PUT | `/api/items/:id` | 管理員 | 編輯物品 |
| DELETE | `/api/items/:id` | 管理員 | 刪除物品 |
| POST | `/api/loans` | 登入 | 借用 |
| GET | `/api/loans/my` | 登入 | 我的借用紀錄 |
| GET | `/api/loans` | 管理員 | 全部借用紀錄 |
| POST | `/api/loans/:id/return` | 本人／管理員 | 歸還 |

驗證方式：登入後將回傳的 token 放在請求標頭 `Authorization: Bearer <token>`。

---

## 🗄️ 資料庫結構

- **users**：使用者（含 `role`：`user` / `admin`，密碼以 scrypt salt:hash 儲存）
- **items**：物品（`total_qty` 總數、`available_qty` 可借數）
- **loans**：借用紀錄（`status`：`borrowed` / `returned`、`due_at` 應還日）
- **tokens**：登入 token

逾期（overdue）不額外存欄位，而是查詢時即時以「未歸還且超過 `due_at`」動態計算。

---

## 📤 上傳到 GitHub

專案已附 `.gitignore`（排除 `node_modules`、`*.db` 等）。

```bash
cd campus-borrow
git init
git add .
git commit -m "友善校園物品借用系統"
git branch -M main
git remote add origin <你的 GitHub repo 網址>
git push -u origin main
```
