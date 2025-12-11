# Flowspace 🌊

**Flowspace** is a cutting-edge, realtime collaborative whiteboard application designed to streamline team brainstorming and ideation. It seamlessly integrates powerful AI capabilities to enhance productivity, allowing users to generate summaries, rewrite content, and create structured sticky notes instantly.

## 🚀 Features

- **Realtime Collaboration**: Draw, add notes, and brainstorm with your team in real-time using efficient WebSocket connections.
- **Infinite Canvas**: A smooth, responsive whiteboard powered by KonvaJS.
- **AI-Powered Tools**:
  - **Summarize**: Instantly generate summaries of selected board content or text.
  - **Rewrite**: Rewrite text in different tones (Professional, Casual, Creative, etc.).
  - **Sticky Note Generator**: Convert rough ideas into clean, formatted sticky notes.
- **Autosave**: Never lose your work with automatic state snapshots saved every 10 seconds.
- **Undo/Redo**: Full history support for all board actions.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite)
- **State Management**: Zustand
- **Canvas Library**: React-Konva / Konva
- **Realtime**: Socket.IO Client

### Backend
- **Server**: Node.js & Express
- **Realtime**: Socket.IO
- **AI Integration**: OpenAI (Integration ready)
- **Persistance**: File-based snapshots (JSON)

## 📂 Project Structure

```
flowspace/
├── frontend/           # React + Vite application
│   ├── src/
│   │   ├── components/ # UI and Canvas components (CanvasBoard, Toolbar)
│   │   ├── state/      # Zustand store
│   │   └── socket/     # Socket.IO client setup
│   └── ...
├── backend/            # Express + Socket.IO server
│   ├── src/
│   │   ├── ai/         # AI services (Summarize, Rewrite, StickyNote + OCR)
│   │   ├── board/      # Board state Manager (Undo/Redo) & Atomic Autosave
│   │   ├── config/     # Environment & Config
│   │   ├── controllers/# API logic
│   │   ├── routes/     # Express routes
│   │   └── socket/     # Socket event handlers (Join, Draw, Cursor)
│   └── ...
└── snapshots/          # Autosaved board states
```

## 🔧 Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and add your API keys.
   ```bash
   cp .env.example .env
   ```
   *Required Keys*: `OPENAI_API_KEY`, `PORT` (default 3000)

3. **Start Server**:
   ```bash
   npm run dev   # Development (Nodemon)
   npm start     # Production
   ```

4. **API Endpoints**:
   - `POST /api/ai/summarize`: Summarize board text.
   - `POST /api/ai/rewrite`: Rewrite text with tone selection.
   - `POST /api/ai/sticky-note`: Generate sticky note from text or image (OCR).

5. **Socket Events**:
   - `join-room`: Join a specific board.
   - `draw-stroke`: Broadcast drawing actions.
   - `undo` / `redo`: Manage board history.
   - `sync-request`: Request full board state.
