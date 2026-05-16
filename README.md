# 🔐 SecurePrint — Secure Zero-Retention Printing

> Privacy-first cloud printing system that ensures your documents **never remain on a stranger’s computer**

---

## 🚀 Live Demo

* 👤 User App: https://secureprintout.in/
* 🖨️ Shop Portal: https://shop.secureprintout.in/

---

## 🧠 Problem

In real life, printing sensitive documents (Aadhaar, PAN, bank statements) at cyber cafés is risky:

* Files remain in **Downloads / cache**
* Shop owners can **reuse or leak documents**
* Users have **zero control after sharing**

---

## 💡 Solution

**PrintIt eliminates file sharing completely.**

Instead of sending files → you send a **temporary print session**

### ⚡ How it works

1. Shop opens portal → gets **6-digit code**
2. User uploads document → enters code
3. File is sent via **secure WebSocket**
4. Document auto-prints
5. File is **instantly destroyed everywhere**

---

## 🔐 Core Features

* 🧠 **Zero Retention** — No file is stored on disk (ever)
* ⏳ **Auto Expiry** — Files deleted within seconds
* 🔑 **One-Time Access Codes** — 6-digit secure pairing
* ⚡ **Real-Time Transfer** — WebSocket-based delivery
* 🖨️ **Auto Print Trigger** — No manual interaction
* 🕶️ **Blurred Preview Mode** — Prevents screen spying
* 💧 **Watermarking** — Traceable printed output

---

## 🏗️ Architecture

```mermaid
graph TB
    User[User App] -->|Upload| Backend
    Backend -->|Store (TTL)| Redis
    Backend -->|WebSocket| Shop
    Shop -->|Print| Printer
```

---

## ⚙️ Tech Stack

### Backend

* Node.js + Express
* Socket.io (real-time)
* Redis (Upstash)
* Multer (in-memory file upload)

### Frontend

* React + Vite
* Tailwind CSS
* PDF.js (canvas rendering)
* Socket.io-client

### Deployment

* Vercel (frontend)
* Render (backend)
* Upstash (Redis)

---

## 📂 Project Structure

```
printit/
│
├── server/          # Backend (Node.js + Socket.io)
├── user-client/     # User App (React PWA)
├── shop-client/     # Shop Portal (React)
├── docs/            # Full architecture & system design
```

---

## 🔐 Security Principles

PrintIt follows strict **zero-retention architecture**:

* ❌ No disk storage
* ❌ No database persistence
* ❌ No file downloads
* ✅ Memory-only processing (Redis + RAM)
* ✅ Auto deletion via TTL
* ✅ One-time token system

---

## 🔄 Data Flow

1. User uploads file (RAM only)
2. Backend validates code
3. File stored temporarily in Redis (TTL)
4. Sent via WebSocket to shop
5. Rendered → printed → destroyed
6. Redis + browser memory cleared

---

## 🧪 Local Setup

### 1. Clone repo

```bash
git clone https://github.com/yourusername/printit.git
cd printit
```

---

### 2. Setup Backend

```bash
cd server
npm install
```

Create `.env`:

```env
REDIS_URL=redis://localhost:6379
PORT=3000
```

Run:

```bash
node server.js
```

---

### 3. Setup User App

```bash
cd ../user-client
npm install
```

Create `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

Run:

```bash
npm run dev
```

---

### 4. Setup Shop Portal

```bash
cd ../shop-client
npm install
```

Create `.env`:

```env
VITE_BACKEND_URL=http://localhost:3000
```

Run:

```bash
npm run dev
```

---

## 🌐 Deployment

| Service  | Platform      |
| -------- | ------------- |
| Frontend | Vercel        |
| Backend  | Render        |
| Database | Upstash Redis |

---

## ⚠️ Limitations

* Cannot prevent **physical camera capture**
* Browser print control is limited
* Depends on stable internet

---

## 🚀 Future Improvements

* 🔐 End-to-end encryption
* 📍 Nearby print shop discovery
* 💳 Payment integration
* 📲 Native mobile app
* 🖨️ Direct printer SDK integration

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first.

---

## 📜 License

MIT License

---

## 💬 Final Thought

> “Your documents deserve privacy — even at a roadside print shop.”

---

⭐ If you found this project interesting, give it a star!
