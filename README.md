<div align="center">

<h1>📚 Vertos Archive</h1>
<p><strong>AI-Powered University Knowledge Platform for LPU Students</strong></p>

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://mongodb.com)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC244C?logo=data:image/svg+xml;base64,)](https://qdrant.tech)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)](https://openai.com)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Storage-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com)

</div>

---

## ✨ What is Vertos Archive?

Vertos Archive is a full-stack, AI-powered academic resource platform built for students at **Lovely Professional University (LPU)**. Students can upload, search, and chat with course materials including notes, previous year question papers (PYQs), syllabi, placement resources, and more — powered by a **Hybrid RAG (Retrieval-Augmented Generation)** engine.

---

## 🚀 Features

### 🤖 AI Chat — Verto AI
- **Hybrid RAG Engine** — Combines semantic vector search (Qdrant) and keyword search (MongoDB `$text`) via Reciprocal Rank Fusion (RRF) for highly relevant answers
- **Streaming responses** — Server-Sent Events (SSE) for real-time token-by-token output
- **Source citations** — Every answer links back to the exact documents used
- **Category filters** — Filter by Notes, Syllabus, PYQs, Placements, Faculty, University Info
- **Conversation history** — Full multi-turn chat with persistent conversations

### 📤 Document Upload
- Upload PDFs, Word docs, PowerPoint files, and images
- **Multi-image upload** — Group multiple image pages under one document entry
- **Automatic text extraction** — pdf-parse for PDFs, officeParser for Office files, GPT-4o Vision for images
- **OCR fallback for scanned/handwritten PDFs** — if standard parsing yields near-zero text, automatically re-processes via GPT-4o Vision OCR

### 🛡️ Admin Moderation Queue
- Review, approve, or reject student uploads before they go live
- **Edit metadata** (title, subject, category) during approval to fix errors
- **Write review notes** visible to the uploader for both approvals and rejections
- Duplicate detection using title/subject similarity search

### 🏆 Gamification & Leaderboard
- Contributors earn **points** (+10 per approved upload) and **trust scores**
- Automatic **badge progression** — Top Contributor (50pts), Elite Verto (100pts)
- Live leaderboard ranking (admin accounts excluded)
- Global community stats — total contributors, documents, points awarded

### 🏠 Homepage Intelligence
- **Popular Searches** — dynamically pulled from real platform analytics
- **Trending Topics** — derived from the most active subjects on the platform
- **Community Uploads Feed** — live feed of newly approved documents
- **Suggested Questions** — AI-generated clickable prompts from document insights

### 👤 User Accounts
- Email/password registration and login (JWT)
- **Google OAuth** sign-in
- Profile page with upload history and contribution stats
- Role-based access (Student / Admin)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **Primary DB** | MongoDB Atlas (Mongoose ODM) |
| **Vector DB** | Qdrant Cloud (semantic search) |
| **AI / LLM** | OpenAI GPT-4o-mini (chat, OCR, insights, embeddings) |
| **File Storage** | Cloudinary (PDFs, images, Office files) |
| **Auth** | JWT + Passport.js (Google OAuth 2.0) |
| **Sessions** | express-session + connect-mongo |
| **File Parsing** | pdf-parse, officeparser, GPT-4o Vision |

---

## 🗂️ Project Structure

```
LPU Assistant/
├── client/                   # React Frontend (Vite)
│   └── src/
│       ├── assets/           # Static images & icons
│       ├── components/       # Reusable UI components (Hero, Navbar, etc.)
│       ├── context/          # AuthContext (global user state)
│       ├── pages/            # Route-level pages
│       │   ├── ChatPage.jsx          # Main AI chat interface
│       │   ├── DashboardPage.jsx     # Homepage with intelligence widgets
│       │   ├── UploadPage.jsx        # Document upload flow
│       │   ├── LeaderboardPage.jsx   # Contributor rankings
│       │   ├── AdminDashboardPage.jsx # Moderation queue
│       │   └── ProfilePage.jsx
│       └── services/
│           └── api.js        # Centralised Axios API client
│
└── server/                   # Node.js Backend (Express)
    └── src/
        ├── config/           # DB, Cloudinary, Passport, app config
        ├── controllers/      # Route handlers (auth, chat, admin, upload…)
        ├── middleware/        # Auth guard, admin guard, rate limiter
        ├── models/           # Mongoose schemas
        │   ├── User.js
        │   ├── Document.js
        │   ├── PendingDocument.js
        │   ├── Conversation.js + Message.js
        │   ├── Contributor.js
        │   ├── Suggestion.js
        │   └── Analytics.js
        ├── routes/           # Express routers
        ├── services/
        │   ├── documentParser.js    # PDF/Office/Image text extraction + Vision OCR
        │   ├── pipelineWorker.js    # Async processing pipeline (chunk → embed → index)
        │   ├── search.service.js    # Hybrid RAG search (Qdrant + MongoDB RRF)
        │   ├── qdrant.service.js    # Vector DB operations
        │   ├── openai.service.js    # Embeddings, chat, insights
        │   └── textChunker.js       # Overlapping text chunking
        └── server.js         # Express app entry point
```

---

## ⚙️ Local Development Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A [MongoDB Atlas](https://mongodb.com/atlas) cluster
- A [Qdrant Cloud](https://qdrant.tech) cluster
- An [OpenAI](https://platform.openai.com) API key
- A [Cloudinary](https://cloudinary.com) account
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 app (optional, for Google sign-in)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/lpu-assistant.git
cd lpu-assistant
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
NODE_ENV=development
PORT=5001
CLIENT_URL=http://localhost:5175

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
SESSION_SECRET=your_session_secret_here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Qdrant
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm run dev   # starts backend on http://localhost:5001
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

```bash
npm run dev   # starts frontend on http://localhost:5175
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register with email/password |
| `POST` | `/api/auth/login` | Public | Login, returns JWT |
| `GET` | `/api/auth/google` | Public | Start Google OAuth flow |
| `GET` | `/api/auth/me` | 🔒 User | Get current user profile |
| `POST` | `/api/upload` | 🔒 User | Upload a document |
| `GET` | `/api/chat/conversations` | 🔒 User | List conversations |
| `POST` | `/api/chat/conversations` | 🔒 User | Create new conversation |
| `POST` | `/api/chat/conversations/:id/message` | 🔒 User | Send message (SSE stream) |
| `GET` | `/api/leaderboard` | Public | Get leaderboard & stats |
| `GET` | `/api/analytics/homepage` | Public | Get homepage intelligence data |
| `GET` | `/api/admin/pending` | 🔐 Admin | Get moderation queue |
| `POST` | `/api/admin/approve/:id` | 🔐 Admin | Approve upload (with metadata edit) |
| `POST` | `/api/admin/reject/:id` | 🔐 Admin | Reject upload (with feedback note) |
| `POST` | `/api/admin/check-duplicate` | 🔐 Admin | Check for duplicate documents |

---

## 🧠 How the RAG Pipeline Works

```
Student uploads PDF
        │
        ▼
┌─────────────────────┐
│  Text Extraction    │  pdf-parse / officeParser / GPT-4o Vision OCR
│  (Upload time)      │  ← OCR fallback auto-triggers if text is sparse
└────────┬────────────┘
         │  (stored in PendingDocument)
         ▼
┌─────────────────────┐
│  Admin Approves     │  Can edit title / subject / category + write note
└────────┬────────────┘
         │  async background job
         ▼
┌─────────────────────┐
│  Pipeline Worker    │
│  1. Chunk text      │  1000 char chunks, 200 overlap
│  2. Embed chunks    │  text-embedding-3-small (1536 dims)
│  3. Push to Qdrant  │  with full metadata payload
│  4. LLM Insights    │  topics + suggested questions via GPT-4o-mini
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Student asks chat  │
│  1. Embed query     │
│  2. Vector search   │  Qdrant top-60
│  3. Keyword search  │  MongoDB $text top-10
│  4. RRF Fusion      │  Reciprocal Rank Fusion scoring
│  5. GPT-4o-mini     │  Generates answer from top chunks (streaming SSE)
└─────────────────────┘
```

---

## 🌐 Deployment

| Service | Platform |
|---|---|
| **Frontend** | [Vercel](https://vercel.com) |
| **Backend** | [Render](https://render.com) |
| **Database** | MongoDB Atlas |
| **Vector DB** | Qdrant Cloud |
| **File Storage** | Cloudinary |

For full step-by-step backend deployment instructions, see the [Render Deployment Guide](./server/DEPLOY.md).

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<div align="center">
  <p>Built with ❤️ for LPU students</p>
  <p><strong>Vertos Archive</strong> — Know More. Share More. Score More.</p>
</div>
