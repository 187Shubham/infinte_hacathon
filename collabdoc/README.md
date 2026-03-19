# CollabDoc — Real-Time Collaborative Editor

A full-stack real-time document collaboration platform built for hackathon. Multiple users can edit documents simultaneously with live sync via WebSockets.

---

## ✨ Features

### Core
- **User Authentication** — Register/login with JWT tokens (7-day expiry)
- **Document Management** — Create, rename, delete documents
- **Real-time Editing** — Changes broadcast instantly via Socket.IO
- **Auto-save** — Documents auto-save every 5 seconds of inactivity
- **Live Presence** — See colored avatars of all active collaborators

### Bonus: Version Control
- Every save creates a version snapshot (up to 20 versions retained)
- View full version history with timestamps and author info
- Revert to any previous version with one click
- Revert snapshots are themselves versioned

### Collaboration
- Invite collaborators by email address
- Owner can remove collaborators
- Shareable document links
- Access control (owner + collaborators only)

---

## 🏗 Architecture

```
collabdoc/
├── backend/
│   ├── server.js          # Express + Socket.IO server
│   ├── models/
│   │   ├── User.js        # Mongoose user schema
│   │   └── Document.js    # Document + versions schema
│   ├── routes/
│   │   ├── auth.js        # Register, login, /me
│   │   └── documents.js   # CRUD + collaborator management
│   └── middleware/
│       └── auth.js        # JWT middleware
└── frontend/
    └── src/
        ├── App.js                      # Router + protected routes
        ├── context/AuthContext.js      # Auth state
        ├── hooks/useSocket.js          # Socket.IO hook
        ├── pages/
        │   ├── AuthPage.js             # Login + Register
        │   ├── Dashboard.js            # Document list
        │   └── DocumentEditor.js      # Main editor
        ├── components/
        │   ├── VersionHistory.js       # Version panel
        │   └── CollaboratorPanel.js    # Share panel
        └── utils/api.js               # Axios API client
```

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6 |
| Real-time | Socket.IO (client + server) |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Containerization | Docker + Docker Compose |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)
```bash
# Clone/unzip the project
cd collabdoc

# Copy env file
cp backend/.env.example backend/.env

# Start everything
docker-compose up --build

# App is live at:
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
```

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, MongoDB running locally

**Backend:**
```bash
cd backend
cp .env.example .env          # Edit JWT_SECRET!
npm install
npm run dev                   # Runs on port 5000
```

**Frontend:**
```bash
cd frontend
npm install
npm start                     # Runs on port 3000
```

---

## 🔌 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-document` | Client → Server | Join a document room |
| `load-document` | Server → Client | Receive initial content |
| `send-changes` | Client → Server | Broadcast content update |
| `receive-changes` | Server → Client | Receive update from others |
| `cursor-move` | Client → Server | Share cursor position |
| `cursor-update` | Server → Client | Receive others' cursors |
| `save-document` | Client → Server | Trigger save + version snapshot |
| `document-saved` | Server → Client | Confirm save with version info |
| `revert-version` | Client → Server | Revert to a past version |
| `document-reverted` | Server → Client | New content after revert |
| `users-update` | Server → Client | Active users list |

---

## 🔒 API Endpoints

### Auth
```
POST /api/auth/register    Body: { username, email, password }
POST /api/auth/login       Body: { email, password }
GET  /api/auth/me          Header: Authorization: Bearer <token>
```

### Documents
```
GET    /api/documents              List user's documents
POST   /api/documents              Create document
GET    /api/documents/:id          Get document
PATCH  /api/documents/:id/title    Update title
DELETE /api/documents/:id          Delete document
GET    /api/documents/:id/versions Version history
POST   /api/documents/:id/collaborators    Add collaborator (email)
DELETE /api/documents/:id/collaborators/:uid  Remove collaborator
```

---

## 🎯 Key Design Decisions

1. **WebSocket auth via handshake** — Token passed in `socket.handshake.auth` for security
2. **Version snapshots on save** — Only saves on explicit save (Ctrl+S or auto-save), not every keystroke
3. **Optimistic UI** — Changes apply locally immediately, then broadcast
4. **Cursor preservation** — Remote changes try to preserve local cursor position
5. **Color-coded users** — Each socket session gets a unique color from a palette

---

## 🔧 Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/collabdoc
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:3000
```

---

## 📝 Usage

1. Register an account at `http://localhost:3000/auth`
2. Create a new document from the dashboard
3. Share the document URL or invite via email
4. Both users open the document — see each other's avatars in the header
5. Type simultaneously — changes sync in real-time
6. Press **Ctrl+S** (or Cmd+S) to save and create a version snapshot
7. Click **🕐 History** to view and revert to past versions
8. Click **👥 Share** to manage collaborators

---

Built with ❤️ for hackathon
