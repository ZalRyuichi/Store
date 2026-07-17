# 🛍️ Ryuichi Store

A Web-Based Digital Store Platform — Buy/Sell Balance & Products, Top Up, Panel Management, WhatsApp Bot Rental, And A Real-Time Chat System Between Users & Owner. Built With Node.js/Express On The Backend And HTML/CSS/JS (Vanilla) On The Frontend With A **Dark Glassmorphism** Theme.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/status-private--project-blue)

---

## ✨ Main Features

- **Authentication**
  - Login/Register With Username & Password
  - Login Via **Google OAuth**
  - Dedicated Admin/Owner Login (Separate From Regular Users)
- **Dashboard**
  - Balance Summary, Dynamic Greeting (Morning/Afternoon/Night), Quick Action Banner
- **Products & Top Up**
  - Product Listing, Buy Products, Buy Balance
  - Top Up Balance Via **Pakasir** (QRIS) With Automatic Payment Status Polling
  - Transaction Notifications To **Telegram**
- **Transaction History**
  - Purchase & Top Up History Per User
- **Tools Suite**
  - A Collection Of Web Tools (Generators, Image Tools, Fun Tools, Etc.) In A Single Page `tools.html` / `utilitas.html`
- **WhatsApp Bot Rental**
  - WhatsApp Bot (Baileys) Session Pairing Directly From The Dashboard
  - Session Management & Rental Expiry Handled By Admin
- **Pterodactyl Panel**
  - Check & Purchase Hosting Panels
- **Real-Time Chat (Encrypted)**
  - Direct Chat Between Users, To The Owner, And A Community Group
  - Chat History Stored **Encrypted (AES-256-GCM)** On GitHub As The Database, Not On Local Disk — Stays Safe Even If The Server Restarts
  - Supports Image Sending, Message Replies, Online Status, And Custom Profile Photos
- **Admin Panel**
  - Manage Users, Transactions, Bot Sessions, And Reply To User Messages Directly From The Owner Side

---

## 🧱 Tech Stack

| Layer          | Technology |
|----------------|-----------|
| Backend        | Node.js, Express |
| Authentication | Custom Session Token + Google OAuth (`google-auth-library`) |
| Chat Database  | GitHub Repository (AES-256-GCM Encrypted JSON) Via GitHub Contents API |
| Other Database | Local JSON For Users, Products, Transactions |
| Payment        | Pakasir (QRIS) |
| Notifications  | Telegram Bot API |
| WhatsApp Bot   | `@whiskeysockets/baileys` |
| Frontend       | HTML, CSS (Dark Glassmorphism), Vanilla JavaScript |

---

## 🔐 Security Notes

- All Chat (Direct & Group) Is Encrypted With **AES-256-GCM** Before Being Stored On GitHub, And Only Decrypted When Read Through The API.
- User, Product, And Transaction Data Is Stored Locally — Make Sure It Is Backed Up Regularly.
- Never Commit The `.env` File To A Public Repository.

---

## 📌 Roadmap / TODO

- [ ] Migrate The Legacy Message System (`/api/messages`, `/api/owner/messages`) So It Is Also Stored On GitHub Like The Main Chat System
- [ ] Sync Group Chat "Read" Status To GitHub (Currently Still Local Disk)
- [ ] Add New Features/Tools To `tools.html`

---

## 📄 License

Private Project — All Rights Reserved By **Ryuichi Store**. Redistribution Without Permission Is Prohibited.

```js
const developer = {
  name: "Zal Ryuichi",
  status: "Butterfly Era",
  hobi: ["Code", "Sleep", "Money"],
};
```
